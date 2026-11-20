import { describe, expect, it } from "vitest";
import { graphqlHandler } from "../src/functions/handler.ts";

const context = {
  error: () => undefined,
  log: () => undefined,
} as never;

describe("Azure Functions GraphQL handler", () => {
  it("responds to a GraphQL query", async () => {
    const request = new Request("http://localhost/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ __typename }" }),
    });

    const response = await graphqlHandler(request as never, context);

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body as string)).toEqual({
      data: { __typename: "Query" },
    });
  });
});
