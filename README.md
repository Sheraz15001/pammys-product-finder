# Pammys Product Finder

This project is my take-home assignment for Pammys.

The goal was to build a small product finder that understands normal user input instead of requiring exact product names. A user can describe what they are looking for, make spelling mistakes, switch between supported languages, or leave out a color or size, and the app will either find the right product or ask for the missing information.

The frontend is built with React and Vite. The workflow and matching logic run in n8n.

## What the app does

- Searches the Pammys catalog from free-text input
- Handles common spelling mistakes and typos
- Matches model, color, and size
- Supports grouped sizes such as `38/39`
- Asks for a missing size or color instead of guessing
- Handles ambiguous model requests
- Supports English, German, French, and Spanish
- Shows product images once candidates are known
- Stores search history in Google Sheets
- Shows previous conversations on desktop and mobile

## Tech stack

### Frontend

- React
- Vite
- Axios
- CSS

### Workflow / backend

- n8n Cloud
- n8n Webhook
- n8n Data Tables
- JavaScript Code node
- AI Agent
- OpenAI Chat Model
- Google Sheets

## My approach

I wanted to keep product matching predictable.

For that reason, I did not use the AI Agent to decide which product is correct. The actual matching happens first in a JavaScript Code node. The AI Agent only receives the structured result and turns it into a short, natural response.

The basic flow is:

```text
User input
   ↓
Normalize the text
   ↓
Match the model
   ↓
Match the color
   ↓
Match the size
   ↓
Return a structured result
   ↓
AI Agent formats the reply
```

The matcher returns one of four result types:

```text
match
missing_size
missing_color
ambiguous_model
```

This makes the workflow easier to test and prevents the AI from inventing products, colors, sizes, or options that are not in the catalog.

## Typo handling

The matching logic uses normalization, edit distance, and fuzzy comparison so that small spelling mistakes still work.

Examples:

```text
Snowbuts 2.0  → Snowboots 2.0
Nightfal      → Nightfall
Hugy          → Huggy
Eboni Heat    → Ebony Heat
Orignals      → Originals
Womam         → Woman
Toffe Crem    → Toffee Cream
```

Numbers are kept stricter than normal words so product versions and sizes are not matched too loosely.

## Multilingual input

The app supports:

- English
- German
- French
- Spanish

The matcher understands common terms such as:

```text
women / Damen / femme / mujer
men / Herren / homme / hombre
size / Größe / taille / talla
```

Generic gender words are treated as category hints.

For example:

```text
Busco zapatoss de mujre.
```

If more than one women's model exists, the workflow returns `ambiguous_model` and asks the user which model they mean instead of automatically choosing one.

A specific misspelled model can still be recognized:

```text
I need Orignals Womam in Toffe Crem, size 39.
```

In this case the input is specific enough to match the intended model.

## Workflow overview

```text
React Frontend
      ↓
n8n Webhook
      ↓
Switch
      ↓
Pammys Products Data Table
      ↓
JavaScript Matcher
      ↓
AI Agent
      ↓
Google Sheets History
      ↓
Respond to Webhook
      ↓
React Frontend
```

The same webhook supports two actions:

```text
search
history
```

`search` runs the product search.

`history` loads the saved conversations from Google Sheets.

## Result types

### `match`

A unique product variant was found.

Example:

```text
Show me Snowboots 2.0 in Nightfall, size 38.
```

Expected result:

```text
match
```

### `missing_size`

The model and color are known, but the user did not provide a size.

Example:

```text
Show me Snowboots 2.0 in Nightfall.
```

Expected result:

```text
missing_size
```

### `missing_color`

The model is known, but the user did not provide a color.

Example:

```text
I'm looking for Originals Woman.
```

Expected result:

```text
missing_color
```

### `ambiguous_model`

The request could refer to more than one model.

Example:

```text
Busco zapatoss de mujre.
```

Expected result:

```text
ambiguous_model
```

## Project structure

```text
pammys-product-finder/
│
├── data/
│   └── Pammys Products.csv
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── api.js
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── n8n/
│   └── My workflow pammys-product-finder.json
│
└── README.md
```

## Setup

### 1. Frontend

Clone the repository and open the frontend folder:

```bash
git clone <repository-url>
cd pammys-product-finder/frontend
```

Install the dependencies:

```bash
npm install
```

Create a local `.env` file based on `.env.example`:

```env
VITE_N8N_WEBHOOK_URL=https://YOUR-N8N-DOMAIN/webhook/product-search
```

Start the frontend:

```bash
npm run dev
```

Vite normally runs at:

```text
http://localhost:5173
```

If the webhook URL is changed, restart the Vite development server so the new environment value is loaded.

### 2. Import the n8n workflow

Import:

```text
n8n/pammys-product-finder-workflow.json
```

After importing it, reconnect or configure:

- the Pammys Products Data Table
- the OpenAI credential
- the Google Sheets credential
- the Pammys History sheet

### 3. Import the product data

The CSV is included here:

```text
data/Pammys Products.csv
```

Import it into an n8n Data Table.

The important fields are:

```text
status
product_title
image_url
```

The product titles follow this format:

```text
Model - Color - Size
```

Example:

```text
Snowboots 2.0 - Nightfall - 38
```

The `Get row(s)` node should return the full catalog so the JavaScript matcher can compare the query against all available products.

### 4. Configure OpenAI

Connect a working OpenAI credential to the OpenAI Chat Model node.

The AI Agent receives only the structured output from the matcher. It is used for response wording, not for choosing the product.

### 5. Configure Google Sheets history

Create or connect a sheet with these columns:

```text
timestamp
session_id
locale
user_message
result_type
assistant_message
product_title
image_url
candidate_images
```

Connect the sheet to:

```text
Append row in sheet
Get row(s) in sheet
```

The first node saves searches. The second one is used by the History view.

### 6. Publish the webhook

The workflow exposes a POST webhook at:

```text
/product-search
```

After publishing the workflow, copy the production webhook URL into:

```text
frontend/.env
```

## API examples

### Search

```json
{
  "action": "search",
  "message": "Show me Snowbuts 2.0 in Nightfal, size 38.",
  "locale": "en",
  "session_id": "example-session-id"
}
```

### History

```json
{
  "action": "history"
}
```

## History

Each search is stored in Google Sheets.

Rows are grouped by `session_id` in the frontend so multiple turns can be shown as one conversation.

A history entry can contain:

- date and time
- user message
- result type
- assistant response
- matched product
- product image
- candidate products and images

On desktop, History is shown in a sidebar.

On mobile, History opens as a full-width list. Tapping an entry opens the conversation details, and the user can go back to the History list.

## Example tests

### Exact match

```text
Show me Huggy in Ebony Heat, size 40/41.
```

Expected:

```text
match
```

### Typo-tolerant match

```text
Show me Snowbuts 2.0 in Nightfal, size 38.
```

Expected:

```text
match
```

### Missing size

```text
Show me Snowboots 2.0 in Nightfall.
```

Expected:

```text
missing_size
```

### Missing color

```text
I'm looking for Originals Woman.
```

Expected:

```text
missing_color
```

### German typo

```text
Ich suche Damenschue.
```

Expected:

```text
ambiguous_model
```

when multiple women's models are available.

### French typo

```text
Je cherche des chaussurs pour feme.
```

Expected:

```text
ambiguous_model
```

when multiple women's models are available.

### Spanish typo

```text
Busco zapatoss de mujre.
```

Expected:

```text
ambiguous_model
```

when multiple women's models are available.

### Specific model with spelling mistakes

```text
I need Orignals Womam in Toffe Crem, size 39.
```

Expected:

The matcher recognizes the intended model and color and resolves the appropriate catalog variant or grouped size when available.

## Security

The real frontend environment file is not meant to be committed:

```text
frontend/.env
```

The repository contains:

```text
frontend/.env.example
```

instead.

API keys and private credentials should not be stored in the repository.

## Final note

The main idea behind this solution was to use deterministic logic for the part that needs to be correct and use AI only where it adds value.

The matcher decides what product or clarification is valid. The AI Agent simply makes that result easier and more natural for the user to read.
