import chalk from 'chalk'

export const logger = {
  success: (message: string) => {
    console.log(chalk.green('✓'), message)
  },

  error: (message: string) => {
    console.log(chalk.red('✗'), message)
  },

  errorSimple: (message: string) => {
    console.log(chalk.red('错误:'), message)
  },

  info: (message: string) => {
    console.log(chalk.blue('ℹ'), message)
  },

  warn: (message: string) => {
    console.log(chalk.yellow('⚠'), message)
  },

  title: (message: string) => {
    console.log('\n' + chalk.bold.cyan(message))
  },

  debug: (message: string) => {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🐛'), message)
    }
  }
}

