import { ThemeProvider } from "@/components/shell/ThemeProvider";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatePill } from "./StatePill";

describe("<StatePill>", () => {
  it("renders FTD with success tone", () => {
    render(
      <ThemeProvider>
        <StatePill state="FTD" />
      </ThemeProvider>,
    );
    expect(screen.getByText("FTD")).toBeInTheDocument();
  });
  it("renders all 9 states", () => {
    const states = [
      "NEW",
      "VALIDATING",
      "REJECTED",
      "PUSHING",
      "PUSHED",
      "ACCEPTED",
      "DECLINED",
      "FTD",
      "FAILED",
    ] as const;
    for (const s of states) {
      const { unmount } = render(
        <ThemeProvider>
          <StatePill state={s} />
        </ThemeProvider>,
      );
      expect(screen.getByText(s)).toBeInTheDocument();
      unmount();
    }
  });
});
