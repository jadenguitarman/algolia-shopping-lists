const { algoliasearch, instantsearch } = window;

const searchClient = algoliasearch(APP_ID, API_KEY);

const startPDPSearch = (objectID) => {
  const search = instantsearch({
    indexName: INDEX,
    searchClient
  });

  search.addWidgets([
    instantsearch.widgets.searchBox({
      container: "#searchbox",
      placeholder: 'Search for products'
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

const loadPDP = async () => {
  const objectID = new URLSearchParams(window.location.href.split('?')[1]).get("objectID") || ''

  addRecentlyViewed(objectID);

  const results = await searchClient.initIndex(INDEX).search('', {
    filters: `objectID:${objectID}`,
  });
  const product = results.hits[0];
  
  document.querySelector('#breadcrumbs').innerText = Object.values(product.hierarchical_categories)
    .map(x => x.split(" > ").at(-1))
    .join(' > ')

  startPDPSearch(objectID);

  document.querySelector('#product-name').innerText = product.name;
  document.querySelector("title").innerText = "Alpha | " + product.name;
  document.querySelector('#product-price').innerText = getPrice(product.price.value, product.price.currency);
  document.querySelector('#product-image').src = product.image_urls[0];

  if (product.available_sizes.length == 1 && product.available_sizes[0] != "one size") {
    document.querySelector("#product-sizes").innerHTML = `<span value="${product.available_sizes[0]}">Size ${product.available_sizes[0]}</span>`;
  } else if (product.available_sizes.length > 1) {
    document.querySelector("#product-sizes").innerHTML = `<label for="size-select">Size:</label> <select id="size-select">${
      product.available_sizes.map(x => `<option>${x}</option>`).join("\n")
    }</select>`;
  }

  document.querySelector('#add-to-cart').addEventListener('click', (e) => {
    const size = document.querySelector("#product-sizes > *")?.value;
    console.debug(`${objectID} in size ${size} added to cart`)
  });
};

loadPDP();