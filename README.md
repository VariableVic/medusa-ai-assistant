<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    </picture>
  </a>
</p>
<h1 align="center">
  Medusa Product AI Widget
</h1>

<p align="center">
  A <a href="https://medusajs.com/">Medusa</a> admin widget to improve product descriptions with AI. Built with <a href="https://docs.medusajs.com/ui">Medusa UI</a>, <a href="https://platform.openai.com/">OpenAI</a> and <a href="https://sdk.vercel.ai/">Vercel AI SDK</a>.
</p>
<p align="center">
  <a href="https://twitter.com/intent/follow?screen_name=VariableVic">
    <img src="https://img.shields.io/twitter/follow/VariableVic.svg?label=Follow%20@VariableVic" alt="Follow @VariableVic" />
  </a>
</p>

https://github.com/VariableVic/medusa-product-ai-widget/assets/42065266/1ba79467-d178-418a-963d-da17b9ee3506


## Prerequisites

1. This plugin requires an OpenAI API key and platform account. Go to https://platform.openai.com/account/api-keys to set this up.
2. You need a Medusa server with the Admin installed. The fastest way to set this up is by using [create-medusa-app](https://docs.medusajs.com/create-medusa-app).

## Getting Started

1. Install the package with `yarn add medusa-product-ai-widget` or `npm i medusa-product-ai-widget`.
2. In `medusa-config.js`, add the plugin to the `plugins` array with the following options:

```js
const plugins = [
  // ... other plugins
  {
    resolve: `medusa-product-ai-widget`,
    options: {
      api_key: process.env.OPENAI_API_KEY,
      enableUI: true
    }
  }
]
```

3. In your `.env` file, add an `OPENAI_API_KEY` environment variable containing your API key:

```
OPENAI_API_KEY=<YOUR OPENAI API KEY>
```

4. Start your dev server and log into the admin. Open any product that has a product description and the widget will appear on the bottom of the page!
