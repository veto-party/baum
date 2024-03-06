
/**
 * Publish intent.
 * 
 * Publishes a package a la "npm publish [--registry=<registry>]".
 */
export interface IPublishIntent extends IExecutionIntent {
    /**
     * Sets the registry, will use npm registry if not defined.
     */
    setRegistry(registry: string | [registry: string, authToken: string]): IPublishIntent;


    /**
     * Publishes the package even if it a scoped package.
     * Will not work for packages with private = true.
     * 
     * @param force 
     */
    setForcePublic(force?: boolean): IPublishIntent;

    /**
     * Sets the authorization token.
     */
    setAuthorization(token: string): IPublishIntent;
}


/**
 * Run intent.
 * 
 * Run as command a la "npm run <command> -- [<parameters>]".
 */
export interface IRunIntent extends IExecutionIntent {

    /**
     * Sets the command.
     */
    setRunStep(command: string): IRunIntent;

    /**
     * Sets the success codes (0 is default = successfully executed)
     */
    setSuccessCodes(codes: number[]): IRunIntent;

    /**
     * Sets the parameters for the command. e.g. npm run <command> --  [<parameters>].
     * Where the -- is not required to pass parameters but does get added because it is the npm separator for command and parameters.
     * 
     */
    setParameters(parameters: string): IRunIntent;

}

/**
 * Command intent.
 * 
 * Runs a command a la "npx <command> <parameters>".
 */
export interface ICommandIntent extends IExecutionIntent {
    /**
     * The command to be executed.
     * 
     * @param command 
     */
    setCommand(command: string): ICommandIntent;

    /**
     * The parameters to be passed to the command intent.
     * 
     * @param parameters 
     */
    setParameters(parameters: string): ICommandIntent;
}

/**
 * Install intent.
 * 
 * Run a install a la "npm <install|ci|rebuild>"
 */
export interface IInstallIntent extends IExecutionIntent {

    /**
     * Keep the lockfile from the root of the workspace to lock all versions properly?
     * 
     * @param keep 
     */
    keepLockFile(keep: boolean): IInstallIntent;

    /**
     * Installs with a frozen lockfile.
     */
    ci(): IInstallIntent;

    /**
     * Does a regular install.
     * Will not update the lockfile, so note that this can have side effects. (YOU SHOULD KNOW WHAT YOU ARE DOING WHEN USING THIS INTENT)
     */
    install(): IInstallIntent;

    /**
     * Rebuilds the builded packages a la "npm rebuild". 
     */
    rebuild(): IInstallIntent;
}


/**
 * Any intent that can be executed.
 */
export interface IExecutionIntent {
    /**
     * @internal
     * 
     * Will validate the intent and make sure that it is valid.
     */
    validate(): void;
}

/**
 * Intent factory.
 */
export interface IExecutionIntentBuilder {

    /**
     * Create a publish intent.
     * 
     * @see IPublishIntent
     */
    publish(): IPublishIntent;

    /**
     * Create a run intent.
     * 
     * @see IRunIntent
     */
    run(): IRunIntent;

    /**
     * Creates a command intent.
     * 
     * @see ICommandIntent
     */
    command(): ICommandIntent;

    /**
     * Creates a install install intent.
     * 
     * @see IInstallIntent;
     */
    install(): IInstallIntent;
}

export interface IPackageManagerExecutor {
    startExecutionIntent(): IExecutionIntentBuilder;
}
