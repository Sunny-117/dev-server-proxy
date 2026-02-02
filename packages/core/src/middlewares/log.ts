import { Request, Response } from "express";
import { decompressFromEncodedURIComponent } from "lz-string";

export function logMiddleware(request: Request, response: Response): void {
  const data: string[] = [];

  request.on("data", (trunk: Buffer) => {
    data.push(trunk && trunk.toString());
  });

  request.on("end", (trunk?: Buffer) => {
    if (trunk) {
      data.push(trunk.toString());
    }

    const str = data.join("");
    let logJson: any = null;

    try {
      const decoded = decompressFromEncodedURIComponent(str);
      logJson = decoded ? JSON.parse(decoded) : null;
    } catch {
      logJson = null;
    }

    response.status(200);

    if (!logJson) {
      response.send(str);
    } else {
      response.send(JSON.stringify(logJson));
    }
  });
}
