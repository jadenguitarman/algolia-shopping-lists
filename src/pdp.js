const { algoliasearch, instantsearch } = window;

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const startPDPSearch = (objectID) => {
  const search = instantsearch({
    indexName: INDEX,
    searchClient,
    insights: false
  });

  search.addWidgets([
    instantsearch.widgets.searchBox({
      container: "#searchbox",
      placeholder: 'Search for products',
      searchAsYouType: false,
      queryHook(query, search) {
        window.location.href = "index.html?query=" + encodeURIComponent(query)
      }
    }),
    carousel(
      instantsearch.widgets.relatedProducts,
      '#relatedProducts',
      'Related Products',
      objectID
    ),
    carousel(
      instantsearch.widgets.lookingSimilar,
      '#lookingSimilar',
      'Looking Similar',
      objectID
    ),
  ]);

  search.start();
  search.on('render', () => {
    document.querySelectorAll('.carousel').forEach(updateCarouselHandles);
  });
};

const hydratePage = product => {
  document.querySelector('#breadcrumbs').innerText = product.breadcrumbs;
  document.querySelector('#product-name').innerText = product.name;
  document.querySelector("title").innerText = "Alpha | " + product.name;
  document.querySelector('#product-price').innerText = "$" + product.price.toFixed(2);
  document.querySelector('#product-image').src = `https://fxqklbpngldowtbkqezm.supabase.co/storage/v1/object/public/product-images/` + product.image;

  const addToCart = document.querySelector('#add-to-cart');
  addToCart.dataset.objectID = product.objectID;
  addToCart.addEventListener('click', (e) => {
    console.debug(`${objectID} in size ${size} added to cart`)
  });
};

const displayIdeas = async (ideas, currentProduct, searchIndex) => {
  const suggestionsContainer = document.querySelector("#suggestions");
  suggestionsContainer.innerHTML = "<h3>Create a shopping list</h3>";
  ideas.forEach(idea => {
    const link = document.createElement("p");
    link.innerText = idea;
    link.addEventListener("click", async () => {
      suggestionsContainer.classList.add("thinking");
      await findProducts(idea, currentProduct, searchIndex);
      suggestionsContainer.classList.remove("thinking");
    });
    suggestionsContainer.appendChild(link);
  });
  suggestionsContainer.classList.remove("thinking");
};

const generateIdeas = async (record, searchIndex) => {
  const sessionShoppingList = "shopping_list" in sessionStorage
    ? JSON.parse(sessionStorage.shopping_list)
    : {};
  if (record.objectID in sessionShoppingList) {
    // sessionStorage already has a generated shopping list and its less than a month old
    displayIdeas(sessionShoppingList[record.objectID].ideas, record, searchIndex);
  } else if ("shopping_list" in record && record.shopping_list.generation_time > Date.now() - 2629746000) {
    // record already has a generated shopping list and its less than a month old
    displayIdeas(record.shopping_list.ideas, record, searchIndex);
  } else {
    const completion = await openai.chat.completions.parse({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user", 
          content: [
            "This is a product from a general store:",
            JSON.stringify({
              name: record.name,
              description: record.description,
              bullets: record.bullets,
              breadcrumbs: record.breadcrumbs,
              stars: record.stars
            }, null, '\t'),
            "Come up with two to four situations which might make a customer buy this item and several others at once. Phrase each idea as a very short (less than 10 words) sentence fragment starting with a gerund and ending with a question mark. Return these ideas as sentence-case strings in an array called 'ideas', returned in JSON format."
          ].join("\n")
        }
      ],
      response_format: zodResponseFormat(
        z.object({
          ideas: z.array(z.string())
        }), 
        "ideas_list"
      )
    });

    const ideas = completion.choices[0].message.parsed.ideas;
    console.log(ideas)
    /*
    searchIndex.partialUpdateObject({
      objectID: record.objectID,
      shopping_list: {
        ideas,
        generation_time: Date.now()
      }
    });
    // */
    sessionShoppingList[record.objectID] = { ideas };
    sessionStorage.shopping_list = JSON.stringify(sessionShoppingList)
    displayIdeas(ideas, record, searchIndex);
  }
};

const findProducts = async (idea, currentProduct, searchIndex) => {
  const toolCallCountTotal = 5;
  let toolCallCount = 0;
  let completion;
  const tools = [
    {
      "type": "function",
      "function": {
        "name": "search_products",
        "description": "Query a product search index.",
        "parameters": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "The search query."
            },
            "num_results": {
              "type": "number",
              "description": "Number of top results to return."
            }
          },
          "required": [
            "query",
            "num_results"
          ],
          "additionalProperties": false
        },
        "strict": true
      }
    }
  ];
  let messages = [
    {
      role: "user", 
      content: [
        `You're helping a user on a general ecommerce website by dynamically creating a shopping list based on the product they're currently buying and their objective. Right now, they're buying this product:`,
        JSON.stringify({
          name: currentProduct.name,
          description: currentProduct.description,
          bullets: currentProduct.bullets,
          breadcrumbs: currentProduct.breadcrumbs,
          stars: currentProduct.stars
        }, null, '\t'),
        `Then they clicked the prompt "${idea}". This is the reason the customer is on the ecommerce website. Use the "search_products" function to find specific items that fit this purpose one at a time. You may call that function up to ${toolCallCountTotal} times. The items should work together to accomplish the customer's purpose. The items should not be variants of each other. Output only the objectID field of each item in an array. You should find at least items in addition to the one that was described to you.`
      ].join("\n")
    }
  ];

  while (true) {
    if (toolCallCount > toolCallCountTotal) break;

    completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      tools,
      response_format: zodResponseFormat(
        z.object({
          objectIDs: z.array(
            z.object({
              objectID: z.string(),
              one_sentence_why_chosen: z.string()
            })
          )
        }), 
        "objectIDs_list"
      )
    });

    if (completion.choices[0].finish_reason == "tool_calls") {
      messages.push(completion.choices[0].message);
      for (let i = 0; i < completion.choices[0].message.tool_calls.length; i++) {
        const toolCall = completion.choices[0].message.tool_calls[i];
        const args = JSON.parse(toolCall.function.arguments);
        console.log(args.query)
        const result = await searchIndex.search(args.query, { hitsPerPage: args.num_results });
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(
            result.hits.map(hit => ({
              objectID: hit.objectID,
              name: hit.name,
              description: hit.description,
              bullets: hit.bullets,
              breadcrumbs: hit.breadcrumbs,
              stars: hit.stars
            })
          ), null, '\t')
        });

        console.log("Tool called");
        toolCallCount++;
      }
    } else if (completion.choices[0].finish_reason == "stop") {
      const chosenProducts = JSON.parse(completion.choices[0].message.content).objectIDs;
      const chosenHits = (await searchIndex.search('', {
        filters: chosenProducts.map(product => `objectID:${product.objectID}`).join(" OR ")
      })).hits;
      const filteredHits = chosenProducts.flatMap(product => {
        const matchingHit = chosenHits.find(x => x.objectID == product.objectID);
        return !!matchingHit
          ? {
            objectID: matchingHit.objectID,
            image: matchingHit.image,
            name: matchingHit.name,
            price: matchingHit.price,
            why_chosen: product.one_sentence_why_chosen
          }
          : []
      });

      const suggestionsContainer = document.querySelector("#suggestions");
      suggestionsContainer.innerHTML = "";
      filteredHits.forEach(hit => {
        const hitContainer = document.createElement("div");
        hitContainer.classList.add("suggested-product");
        hitContainer.innerHTML = `
          <img src="https://fxqklbpngldowtbkqezm.supabase.co/storage/v1/object/public/product-images/${hit.image}"/>
          <div>
            <h4>${hit.name}</h4>
            <p>${hit.why_chosen}</p>
          </div>
          <button data-objectID="${hit.objectID}">Add to cart for $${hit.price}</button>
        `;
        suggestionsContainer.appendChild(hitContainer);
      });

      console.log(filteredHits);
      break;
    }
  }
};

const getProductDetails = async (objectID, searchIndex) => {
  const { hits } = await searchIndex.search('', {
    filters: `objectID:${objectID}`
  });

  const product = {
    ...hits[0],
    breadcrumbs: Object.values(hits[0].hierarchicalCategories)
      .map(x => x.split(" > ").at(-1))
      .join(' > ')
  };

  console.log(product)
  generateIdeas(product, searchIndex);
  hydratePage(product);
};

const searchClient = algoliasearch(APP_ID, API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});
const objectID = new URLSearchParams(window.location.href.split('?')[1]).get("objectID") || '';
startPDPSearch(objectID);
getProductDetails(objectID, searchClient.initIndex(INDEX));