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
  Medusa AI Order Returns Assistant
</h1>


An AI Order Returns Assistant widget for the [Medusa](https://medusajs.com/) admin. You can use natural language to explain the situation, and it will extract all necessary data to create the return order. Built with [Medusa UI](https://docs.medusajs.com/ui), [OpenAI](https://platform.openai.com), and [Vercel AI SDK](https://sdk.vercel.ai).

Feel free to take this code and use it to create any Medusa AI assistant you need. By editing the system prompt in `src/api/routes/admin/completion/order-returns.ts` and the functions in `src/util/gpt-functions/returns.ts` and `src/admin/widgets/assistants/order-assistant.tsx`, you can change its behavior and give it access to different admin hooks.

**Disclaimer**: this code is the result of my experimentation, and is by no means optimized or actively maintained.

<p align="center">
  <a href="https://twitter.com/intent/follow?screen_name=VariableVic">
    <img src="https://img.shields.io/twitter/follow/VariableVic.svg?label=Follow%20@VariableVic" alt="Follow @VariableVic" />
  </a>
</p>

https://github.com/VariableVic/medusa-ai-assistant/assets/42065266/51ce4de4-c0e9-423c-baf2-d86eb3129097

## Prerequisites

1. This widget requires an OpenAI platform account and API key. Go to https://platform.openai.com/account/api-keys to set this up.
2. You need a valid Medusa database. The fastest way to set this up is by using [create-medusa-app](https://docs.medusajs.com/create-medusa-app).

## Getting Started

1. Clone repo and install dependencies.
2. In your `.env` file, add an `OPENAI_API_KEY` environment variable containing your API key, and link  your database:

```
OPENAI_API_KEY=<YOUR OPENAI API KEY>
DATABASE_URL=<YOUR MEDUSA DB URL>
```

3. Start your dev server and log into the admin. Open any order details page and the widget will appear on the bottom of the page!
