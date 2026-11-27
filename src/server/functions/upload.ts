import { app } from "@azure/functions";
import { uploadHandler } from "./uploadHandler.ts";

app.http("upload", {
  methods: ["POST"],
  authLevel: "function",
  route: "upload/{idUser}/{idPet}",
  handler: uploadHandler,
});

console.log("[functions] upload function registered");
