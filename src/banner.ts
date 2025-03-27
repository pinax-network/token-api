import pkg from "../package.json" with { type: "json" };
import { APP_VERSION, config } from "./config.js";

export function banner() {
    let text = `

    ████████╗░█████╗░██╗░░██╗███████╗███╗░░██╗  ░█████╗░██████╗░██╗
    ╚══██╔══╝██╔══██╗██║░██╔╝██╔════╝████╗░██║  ██╔══██╗██╔══██╗██║
    ░░░██║░░░██║░░██║█████═╝░█████╗░░██╔██╗██║  ███████║██████╔╝██║
    ░░░██║░░░██║░░██║██╔═██╗░██╔══╝░░██║╚████║  ██╔══██║██╔═══╝░██║
    ░░░██║░░░╚█████╔╝██║░╚██╗███████╗██║░╚███║  ██║░░██║██║░░░░░██║
    ░░░╚═╝░░░░╚════╝░╚═╝░░╚═╝╚══════╝╚═╝░░╚══╝  ╚═╝░░╚═╝╚═╝░░░░░╚═╝
`;
    text += `                 Token API v${APP_VERSION}\n`
    text += `               ${pkg.homepage}\n`
    text += `                      ${config.dbEvmSuffix}\n`
    text += `                      ${config.dbSvmSuffix}\n`
    text += `                    ${config.dbAntelopeSuffix}\n`

    return text;
}

console.log(banner());