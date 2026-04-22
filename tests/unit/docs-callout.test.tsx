// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Callout } from "@/components/docs/Callout";
import { DeepRefCard } from "@/components/docs/DeepRefCard";

describe("Callout", () => {
  it("renders title + body with the right style", () => {
    const { container, getByText } = render(
      <Callout type="warning" title="Heads up">body</Callout>,
    );
    expect(getByText("Heads up")).toBeDefined();
    expect(container.querySelector("aside")?.className).toMatch(/amber/);
  });
});

describe("DeepRefCard", () => {
  it("builds a /docs/<block>/_deep/<kind> href", () => {
    const { container } = render(
      <DeepRefCard block="intake" kind="prisma" title="Lead model" anchor="db-lead" />,
    );
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/docs/intake/_deep/db-schema#db-lead");
  });
});
