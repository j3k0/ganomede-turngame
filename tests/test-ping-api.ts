import assert from "assert";
import { addRoutes } from "../src/ping-api";
import { createServer } from "./fake-restify";
import { Server } from "restify";

const server = createServer();

describe("ping-api", () => {

  before(() => {
    addRoutes("users", server as unknown as Server);
  });

  it("should have get and head routes", () => {
    assert.ok(server.routes.get["/users/ping/:token"]);
    assert.ok(server.routes.head["/users/ping/:token"]);
  });

  it("should reply to a ping with a pong", () => {
    server.request("get", "/users/ping/:token", { params: { token: "pop" } });
    assert.equal(server.res?.body, "pong/pop");
    server.request("head", "/users/ping/:token", { params: { token: "beep" } });
    assert.equal(server.res?.body, "pong/beep");
  });

});
