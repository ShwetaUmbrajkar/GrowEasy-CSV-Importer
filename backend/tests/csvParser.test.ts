import { parseCsv } from "../src/services/csvParser.service";

describe("parseCsv", () => {
  it("parses a simple CSV into row objects keyed by header", () => {
    const csv = "Name,Email\nJohn Doe,john@example.com\nJane Roe,jane@example.com";
    const { rows, headers } = parseCsv(csv);

    expect(headers).toEqual(["Name", "Email"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ Name: "John Doe", Email: "john@example.com" });
  });

  it("works with arbitrary/non-standard column names", () => {
    const csv = "Full Name,Contact No,Lead Src\nAmit,9876543210,Facebook";
    const { rows } = parseCsv(csv);
    expect(rows[0]["Contact No"]).toBe("9876543210");
  });

  it("skips fully empty rows", () => {
    const csv = "Name,Email\nJohn,john@x.com\n,\nJane,jane@x.com";
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it("trims whitespace from headers and values", () => {
    const csv = " Name , Email \n  John  ,  john@x.com  ";
    const { rows, headers } = parseCsv(csv);
    expect(headers).toEqual(["Name", "Email"]);
    expect(rows[0].Name).toBe("John");
  });
});
