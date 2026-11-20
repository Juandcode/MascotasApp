import { app } from "@azure/functions";
import { graphqlHandler } from "./handler.ts";

app.http("graphql", {
  methods: ["GET", "POST"],
  authLevel: "function",
  route: "graphql",
  handler: graphqlHandler,
});
