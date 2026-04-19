import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pill } from "./Pill";

describe("<Pill>", () => {
  it("renders children with neutral tone by default", () => {
    render(<Pill>HELLO</Pill>);
    expect(screen.getByText("HELLO")).toBeInTheDocument();
  });
  it("accepts size='xs'", () => {
    render(<Pill size="xs">XS</Pill>);
    const el = screen.getByText("XS");
    expect(el).toBeInTheDocument();
  });
  it("accepts solid variant", () => {
    render(
      <Pill tone="danger" solid>
        DANGER
      </Pill>,
    );
    expect(screen.getByText("DANGER")).toBeInTheDocument();
  });
});
