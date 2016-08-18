# How to write add-on tests with stubs/mocks

### Requiring the file

Let's say we have a file called `AvocadoProvider.js`. Since we have a bunch of mocks already defined in the `mocks/` folder,
we might already be able to require.

### Create an injector function with inject!

Let's say we have a file called `AvocadoProvider.js` we want to test. First, we require the file into our test with a special syntax:

```js
// AvocadoProvider.test.js
const AvocadoProviderCreator = require("inject!addon/AvocadoProvider");
```

Notice the `inject!` before the file path. This will return a function which returns an `AvocadoProvider`, i.e. what you would get if you just did `require("addon/AvocadoProvider")`:

```js
// AvocadoProvider.test.js
const AvocadoProviderCreator = require("inject!addon/AvocadoProvider");

```
