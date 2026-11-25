import type { ApolloServerPlugin } from "@apollo/server";
import type { MyContext } from "../context.ts";

export const graphqlLoggingPlugin: ApolloServerPlugin<MyContext> = {
  async requestDidStart(requestContext) {
    const startedAt = Date.now();
    const operationName = requestContext.request.operationName ?? "anonymous";

    console.log(`[graphql] request operation=${operationName}`);

    return {
      async didEncounterErrors(errorContext) {
        const codes = errorContext.errors.map(
          (error) => error.extensions?.code ?? "UNKNOWN",
        );
        console.error(
          `[graphql] errors operation=${operationName} count=${codes.length} codes=${codes.join(",")}`,
        );
      },
      async willSendResponse(responseContext) {
        console.log(
          `[graphql] response operation=${operationName} durationMs=${Date.now() - startedAt} errors=${responseContext.errors?.length ?? 0}`,
        );
      },
    };
  },
};
