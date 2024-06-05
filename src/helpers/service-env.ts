/**
 * Helper class for working with service environment variables.
 */
class ServiceEnv {
  static config(name: string, port: number) {
    return {
      exists: ServiceEnv.exists(name, port),
      host: ServiceEnv.host(name, port),
      port: ServiceEnv.port(name, port),
      protocol: ServiceEnv.protocol(name, port),
      url: ServiceEnv.url(name, port),
    };
  }

  static addrEnv(name: string, port: number): string {
    return `${name}_PORT_${port}_TCP_ADDR`;
  }

  static portEnv(name: string, port: number): string {
    return `${name}_PORT_${port}_TCP_PORT`;
  }

  static protocolEnv(name: string, port: number): string {
    return `${name}_PORT_${port}_TCP_PROTOCOL`;
  }

  static exists(name: string, port: number): boolean {
    return Object.prototype.hasOwnProperty.call(process.env, ServiceEnv.addrEnv(name, port));
  }

  static url(name: string, port: number): string | undefined {
    if (!ServiceEnv.exists(name, port)) {
      return undefined;
    } else {
      const protocol = ServiceEnv.protocol(name, port);
      const host = ServiceEnv.host(name, port);
      const portValue = ServiceEnv.port(name, port);
      let url = `${protocol}://${host}`;
      if (portValue !== 80 && portValue !== 443) {
        url += `:${portValue}`;
      }
      return url;
    }
  }

  static host(name: string, port: number): string {
    return process.env[ServiceEnv.addrEnv(name, port)] || '127.0.0.1';
  }

  static port(name: string, port: number): number {
    return +(process.env[ServiceEnv.portEnv(name, port)] || port);
  }

  static protocol(name: string, port: number): string {
    return process.env[ServiceEnv.protocolEnv(name, port)] || 'http';
  }
}

export default ServiceEnv;
