import { type ILogObj, Logger } from 'tslog';
import { APP_VERSION, config } from './config.js';

class TsLogger extends Logger<ILogObj> {
    constructor() {
        super();
        this.settings.minLevel = 5;
        this.settings.name = APP_VERSION;
    }

    public enable(type: 'pretty' | 'json' = 'pretty') {
        this.settings.type = type;
        this.settings.minLevel = 0;
        this.info('Enabled logger');
    }

    public disable() {
        this.settings.type = 'hidden';
        this.settings.minLevel = 5;
        this.info('Disabled logger');
    }

    public getLevel() {
        return this.settings.minLevel;
    }

    public setLevel(level: number) {
        this.settings.minLevel = level;
    }
}

export const logger = new TsLogger();
if (config.verbose) logger.enable(config.prettyLogging ? 'pretty' : 'json');
