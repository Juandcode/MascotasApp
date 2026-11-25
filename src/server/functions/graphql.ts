import { app, type HttpHandler } from "@azure/functions";
import { graphqlHandler } from "./handler.ts";

const handler: HttpHandler = async (request, context) => {
  const startedAt = Date.now();
  console.log(
    `[http] graphql method=${request.method} path=${request.url.split("?")[0]} invocationId=${context.invocationId}`,
  );

  try {
    const response = await graphqlHandler(request, context);

    console.log(
      `[http] graphql response status=${response.status ?? 200} invocationId=${context.invocationId} durationMs=${Date.now() - startedAt}`,
    );

    return response;
  } catch (error) {
    console.error(
      `[http] graphql failure invocationId=${context.invocationId} durationMs=${Date.now() - startedAt}`,
      error,
    );
    throw error;
  }
};

app.http("graphql", {
  methods: ["GET", "POST"],
  authLevel: "function",
  route: "graphql",
  handler,
});

console.log("[functions] graphql function registered");
