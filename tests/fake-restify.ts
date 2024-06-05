class Res {
  status: number;
  body: any;

  constructor() {
    this.status = 200;
  }

  send(data: any) {
    this.body = data;
  }
}

type RouteCallback = (req: any, res: Res, next: (data: any) => void) => void;

class Server {

  res?: Res;

  routes: {
    get: { [url: string]: RouteCallback };
    head: { [url: string]: RouteCallback };
    put: { [url: string]: RouteCallback };
    post: { [url: string]: RouteCallback };
    del: { [url: string]: RouteCallback };
  };

  constructor() {
    this.routes = {
      get: {},
      head: {},
      put: {},
      post: {},
      del: {},
    };
  }

  get(url: string, callback: RouteCallback) {
    this.routes.get[url] = callback;
  }

  head(url: string, callback: RouteCallback) {
    this.routes.head[url] = callback;
  }

  put(url: string, callback: RouteCallback) {
    this.routes.put[url] = callback;
  }

  post(url: string, callback: RouteCallback) {
    this.routes.post[url] = callback;
  }

  del(url: string, callback: RouteCallback) {
    this.routes.del[url] = callback;
  }

  request(type: keyof Server['routes'], url: string, req: any, callback?: (res?: Res) => void) {
    const route = this.routes[type][url];
    this.res = new Res();
    if (route) {
      route(req, this.res, data => {
        if (callback) callback(this.res);
      });
    } else {
      this.res.status = 404;
      this.res.send({ error: 'Not Found' });
      if (callback) {
        callback(this.res);
      }
    }
  }
}

export const createServer = () => new Server();
