import figlet from "figlet"
import boxen from "boxen"
import chalk from "chalk"

import * as app from "../app.js"

const listener: app.Listener<"ready"> = {
  event: "ready",
  description: "Just log that bot is ready",
  once: true,
  async run() {
    app.log(
      `All ready! ${chalk.blue(
        "Default prefix is set as:"
      )} ${chalk.bgBlueBright.black(process.env.BOT_PREFIX)}`
    )

    figlet(app.fetchPackageJson().name, (err, value) => {
      if (err) return app.error(err, "ready.native", true)

      console.log(
        boxen(chalk.blueBright(value), {
          float: "center",
          borderStyle: {
            topLeft: " ",
            topRight: " ",
            bottomLeft: " ",
            bottomRight: " ",
            top: " ",
            left: " ",
            right: " ",
            bottom: " ",
          },
        })
      )
    })
  },
}

export default listener
