import React from "react";
import { render } from "@testing-library/react-native";
import App from "../App";

describe("<App /> Component & UI Tests", () => {
  it("renders App component without crashing", () => {
    const res = render(<App />);
    expect(res).toBeDefined();
  });
});
