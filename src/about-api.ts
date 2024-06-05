import { hostname } from "os";
import pk from "../package.json";
import { Request, Response, Next, Server } from "restify";

interface AboutInfo {
  hostname: string;
  type: string;
  version: string;
  description: string;
  startDate: string;
}

const about: AboutInfo = {
  hostname: hostname(),
  type: pk.name,
  version: pk.version,
  description: pk.description,
  startDate: new Date().toISOString()
};

function sendAbout(req: Request, res: Response, next: Next): void {
  res.send(about);
  next();
}

export function addRoutes(prefix: string, server: Server): void {
  server.get("/about", sendAbout);
  server.get(`/${prefix}/about`, sendAbout);
}

export default {addRoutes};