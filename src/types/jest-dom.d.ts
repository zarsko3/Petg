// This file extends Jest's expect with custom matchers from @testing-library/jest-dom
import '@testing-library/jest-dom';

// Re-export jest-dom types to make them available globally
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(...classNames: string[]): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeDisabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveFocus(): R;
      toBeVisible(): R;
      toBeChecked(): R;
      toBeValid(): R;
      toBeInvalid(): R;
      toHaveValue(value: string | number): R;
      toHaveDisplayValue(value: string | RegExp): R;
      toBeRequired(): R;
      toHaveAccessibleDescription(text?: string | RegExp): R;
      toHaveAccessibleName(text?: string | RegExp): R;
      toHaveFormValues(values: Record<string, any>): R;
      toHaveStyle(css: string | Record<string, any>): R;
      toContainElement(element: HTMLElement | null): R;
      toContainHTML(html: string): R;
      toHaveErrorMessage(text?: string | RegExp): R;
      toBePartiallyChecked(): R;
      toHaveDescription(text?: string | RegExp): R;
    }
  }
}

export {}; 