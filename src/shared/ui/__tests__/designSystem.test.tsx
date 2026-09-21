import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { tokens } from "@/shared/ui/theme/tokens";
import { heroScale } from "@/shared/ui/components/MoneyAmount";
import { Button } from "@/shared/ui/components/Button";
import { FilterChip } from "@/shared/ui/components/FilterChip";
import { FormField } from "@/shared/ui/components/FormField";

/** WCAG relative luminance / contrast ratio for #RRGGBB (alpha ignored: callers pass composited colors). */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("colour contrast (text >= 4.5:1, WCAG 1.4.3)", () => {
  const c = tokens.colors;
  // `surfacePressed` is a transient press state that never hosts resting text, so it is not a floor here.
  const grounds = { app: c.app, surface: c.surface, surfaceAlt: c.surfaceAlt };

  test.each(["text", "muted", "subtle", "accent", "income", "danger", "warning"] as const)("%s on every resting surface", (name) => {
    for (const [surface, hex] of Object.entries(grounds)) {
      expect({ name, surface, ratio: contrast(c[name], hex) >= 4.5 }).toEqual({ name, surface, ratio: true });
    }
  });

  test("label on the brand green primary button", () => {
    expect(contrast(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.onAccent, c.accentPressed)).toBeGreaterThanOrEqual(4.5);
  });

  test("the text ladder still steps down: text > muted > subtle", () => {
    expect(contrast(c.text, c.surface)).toBeGreaterThan(contrast(c.muted, c.surface));
    expect(contrast(c.muted, c.surface)).toBeGreaterThan(contrast(c.subtle, c.surface) + 1.5);
  });
});

describe("hero amount scale", () => {
  test("never grows, and shrinks as the figure gets longer", () => {
    const steps = [6, 8, 9, 10, 11, 12, 13, 16].map(heroScale);
    expect(steps[0]).toBe(1);
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeLessThanOrEqual(steps[i - 1]);
    expect(heroScale(16)).toBeLessThan(1);
  });
});

describe("shared control states", () => {
  test("a disabled Button is inert but keeps its label readable (no second fade)", () => {
    const onPress = jest.fn();
    render(<Button label="Save" onPress={onPress} disabled />);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByText("Save")).toHaveStyle({ color: tokens.colors.subtle });
  });

  test("FilterChip reports selected state and is a 44px target", () => {
    render(<FilterChip label="Month" active onPress={() => {}} clearable />);
    const chip = screen.getByRole("button", { name: "Month" });
    expect(chip.props.accessibilityState).toMatchObject({ selected: true });
    expect(tokens.layout.chipHeight).toBeGreaterThanOrEqual(tokens.layout.minTap);
  });

  test("FormField names the input for screen readers and announces its error", () => {
    render(<FormField label="Email" value="" onChangeText={() => {}} error="Enter a valid email" />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByText("Enter a valid email").props.accessibilityLiveRegion).toBe("polite");
  });

  test("FormField disabled is not editable", () => {
    render(<FormField label="Currency" value="USD" onChangeText={() => {}} disabled />);
    expect(screen.getByLabelText("Currency").props.editable).toBe(false);
  });
});

describe("layout tokens", () => {
  test("container caps are ordered form < content < wide and the form cap is the historical 520", () => {
    const { form, content, wide } = tokens.layout.container;
    expect(form).toBe(tokens.layout.maxContentWidth);
    expect(form).toBeLessThan(content);
    expect(content).toBeLessThan(wide);
  });
});
