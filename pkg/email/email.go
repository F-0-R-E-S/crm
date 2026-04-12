// Package email validates email addresses: format (RFC 5322 subset), DNS MX, and disposable domain detection.
package email

import (
	"context"
	"net"
	"regexp"
	"strings"
	"time"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9.!#$%&'*+/=?^_` + "`" + `{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$`)

type Result struct {
	Original   string `json:"original"`
	Normalized string `json:"normalized"`
	Valid      bool   `json:"valid"`
	Disposable bool   `json:"disposable"`
	HasMX      bool   `json:"has_mx"`
	Reason     string `json:"reason,omitempty"`
}

func Validate(ctx context.Context, email string) Result {
	email = strings.TrimSpace(email)
	r := Result{Original: email}

	if email == "" {
		r.Reason = "empty email"
		return r
	}

	if len(email) > 254 {
		r.Reason = "email exceeds 254 characters"
		return r
	}

	if !emailRegex.MatchString(email) {
		r.Reason = "invalid email format"
		return r
	}

	parts := strings.SplitN(email, "@", 2)
	if len(parts) != 2 {
		r.Reason = "invalid email format"
		return r
	}

	local, domain := parts[0], strings.ToLower(parts[1])

	if len(local) > 64 {
		r.Reason = "local part exceeds 64 characters"
		return r
	}

	r.Normalized = normalizeLocal(local, domain) + "@" + domain
	r.Valid = true

	r.Disposable = isDisposable(domain)

	r.HasMX = checkMX(ctx, domain)

	return r
}

func normalizeLocal(local, domain string) string {
	local = strings.ToLower(local)

	gmailDomains := map[string]bool{
		"gmail.com":    true,
		"googlemail.com": true,
	}

	if gmailDomains[domain] {
		local = strings.ReplaceAll(local, ".", "")
		if idx := strings.Index(local, "+"); idx >= 0 {
			local = local[:idx]
		}
	} else {
		if idx := strings.Index(local, "+"); idx >= 0 {
			local = local[:idx]
		}
	}

	return local
}

func checkMX(ctx context.Context, domain string) bool {
	resolver := &net.Resolver{}
	dnsCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	mxRecords, err := resolver.LookupMX(dnsCtx, domain)
	if err == nil && len(mxRecords) > 0 {
		return true
	}

	// Fallback: check A/AAAA records
	addrs, err := resolver.LookupHost(dnsCtx, domain)
	return err == nil && len(addrs) > 0
}

var disposableDomains = map[string]bool{
	"mailinator.com": true, "guerrillamail.com": true, "guerrillamail.net": true,
	"tempmail.com": true, "throwaway.email": true, "temp-mail.org": true,
	"fakeinbox.com": true, "sharklasers.com": true, "guerrillamailblock.com": true,
	"grr.la": true, "dispostable.com": true, "yopmail.com": true,
	"yopmail.fr": true, "trashmail.com": true, "trashmail.me": true,
	"trashmail.net": true, "mailnesia.com": true, "maildrop.cc": true,
	"discard.email": true, "mailcatch.com": true, "getairmail.com": true,
	"mailexpire.com": true, "tempail.com": true, "tempr.email": true,
	"10minutemail.com": true, "mohmal.com": true, "burnermail.io": true,
	"getnada.com": true, "emailondeck.com": true, "33mail.com": true,
	"mytemp.email": true, "spam4.me": true, "harakirimail.com": true,
	"mintemail.com": true, "mailsac.com": true, "moakt.com": true,
	"tempinbox.com": true, "inboxbear.com": true, "crazymailing.com": true,
	"temp-mail.io": true, "spamgourmet.com": true, "mailnull.com": true,
	"spamfree24.org": true, "jetable.org": true, "trashymail.com": true,
	"mailzilla.com": true, "binkmail.com": true, "safetymail.info": true,
	"filzmail.com": true, "mailforspam.com": true, "trash-mail.at": true,
	"rcpt.at": true, "trashmail.org": true, "wegwerfmail.de": true,
	"wegwerfmail.net": true, "einrot.com": true, "sogetthis.com": true,
	"mailinater.com": true, "trbvm.com": true, "yomail.info": true,
	"mailscrap.com": true, "deadaddress.com": true, "nomail.xl.cx": true,
	"rmqkr.net": true, "tmail.ws": true, "veryrealmail.com": true,
	"tempmailo.com": true, "tempmailaddress.com": true, "tempmail.ninja": true,
	"spambox.us": true, "mailtemp.info": true, "mail-temporaire.fr": true,
	"one-time.email": true, "luxusmail.org": true, "tmpmail.net": true,
	"tmpmail.org": true, "emailisvalid.com": true, "trashcanmail.com": true,
	"emailwarden.com": true, "guerrillamail.info": true, "guerrillamail.biz": true,
	"guerrillamail.de": true, "guerrillamail.org": true,
	"zetmail.com": true, "inboxalias.com": true, "anonymbox.com": true,
	"fakemailgenerator.com": true, "emailsensei.com": true, "mailhero.io": true,
	"emkei.cz": true, "mailnator.com": true, "anonbox.net": true,
	"bobmail.info": true, "cool.fr.nf": true, "courriel.fr.nf": true,
	"moncourrier.fr.nf": true, "monemail.fr.nf": true, "monmail.fr.nf": true,
	"hide.biz.st": true, "mymail.infos.st": true,
}

func isDisposable(domain string) bool {
	if disposableDomains[domain] {
		return true
	}
	parts := strings.SplitN(domain, ".", 2)
	if len(parts) == 2 {
		return disposableDomains[parts[1]]
	}
	return false
}
