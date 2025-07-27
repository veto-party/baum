# baum
Tree shaking and building for monorepos

Baum is similar to turbo and other monorepo manangers.
But it comes with more flexibility for running tasks.
& Also the caching is completly free & is fully functional as long as you host your own npm registry.
Oherwise you can define your own logic to cache, for example using a file or any other custom mechanism.

It is built with flexibility in mind.

## How to use baum

1. install baum using npm or yarn:
`npm install install baum`
or
`yarn add baum`

2. Create a file named `baum.ts` in any diretory that belongs to the ci, it does not need to be part of the monorepo.
3. Define some steps in your baum.ts file like in `ci/test/steps.ts` ignore the file name `steps.ts`, since these steps are used in multiple places whilist the `baum.ts` file just contains the configuration & also imports runs the function defined in `steps.ts`.
4. Define the baum command in the package.json like this: `baum --config ci/test`.
5. Now Run the defined command.


## How to install for development ?

1. clone the repoistory.
2. run `npm install` in the root directory.
3. run `npm run baum-test` to verify that everthing is working as expected.

## How to publish a new version of baum?

You just create a tag in github, the rest is done by baum itself.
Forking is currently not supported, but will be in the future.


