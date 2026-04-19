import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sparkline } from "./Sparkline";

describe("<Sparkline>", () => {
  it("renders an svg with one polyline path", () => {
    const { container } = render(<Sparkline points={[1, 2, 3, 2, 4]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });
  it("renders an area path when fill is set", () => {
    const { container } = render(<Sparkline points={[1,2,3]} fill="rgba(0,255,0,0.2)" />);
    expect(container.querySelectorAll("path")).toHaveLength(2);
  });
  it("handles flat (all-equal) series without NaN", () => {
    const { container } = render(<Sparkline points={[5, 5, 5, 5]} />);
    const d = container.querySelector("path")?.getAttribute("d") ?? "";
    expect(d).not.toContain("NaN");
  });
});
