import { Logger, type ILogObj } from "tslog";
import { APP_NAME, APP_VERSION, config } from "./config.js";

class TsLogger extends Logger<ILogObj> {
    constructor() {
        super();
        this.settings.minLevel = 5;
        this.settings.name = `${APP_NAME}:${APP_VERSION.version}+${APP_VERSION.commit}`;
    }

    public enable(type: "pretty" | "json" = "pretty") {
        this.settings.type = type;
        this.settings.minLevel = 0;
        this.info("Enabled logger");
    }

    public disable() {
        this.settings.type = "hidden";
        this.info("Disabled logger");
    }
}

export const logger = new TsLogger();
if (config.verbose) logger.enable(config.prettyLogging ? "pretty" : "json");