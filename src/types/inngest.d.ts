declare module "inngest" {
  export interface ClientOptions {
    id: string;
    name: string;
  }

  interface StepTools {
    run<T>(name: string, fn: () => Promise<T>): Promise<T>;
  }

  interface FunctionOptions {
    id: string;
    name: string;
  }

  interface CronTrigger {
    cron: string;
  }

  export class Inngest {
    constructor(options: ClientOptions);
    createFunction(
      options: FunctionOptions,
      trigger: CronTrigger,
      handler: (ctx: { step: StepTools }) => Promise<void>
    ): unknown;
  }
}
