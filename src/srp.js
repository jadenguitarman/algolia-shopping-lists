const { algoliasearch, instantsearch } = window;

const searchClient = algoliasearch(APP_ID, API_KEY);

const startSRPSearch = () => {
  const search = instantsearch({
    indexName: INDEX,
    searchClient,
    insights: false,
    initialUiState: {
      [INDEX]: {
        query: new URLSearchParams(window.location.href.split('?')[1]).get("query") || ''
      },
    }
  });

  search.addWidgets([
    instantsearch.widgets.searchBox({
      container: "#searchbox",
      placeholder: 'Search for products'
    }),
    instantsearch.widgets.infiniteHits({
      container: '#hits',
      templates: {
        item: renderHit,
        empty: results => `<p>No results <q>${results.query}</q></p>`
      }
    }),
    instantsearch.widgets.configure({
      hitsPerPage: 20,
      facetingAfterDistinct: true,
    }),
    instantsearch.widgets.menu({
      container: '#gender',
      attribute: 'gender',
    }),
    instantsearch.connectors.connectPagination(
      ({ currentRefinement, refine, nbHits, widgetParams }, isFirstRender) => {
        const container = document.querySelector(widgetParams.container);
        const maxHits = widgetParams.hitsPerPage * (1 + currentRefinement);
        let seen = maxHits > nbHits ? nbHits : maxHits;

        if (!nbHits || seen == nbHits) container.classList.add('pagination-done');
        else {
          container.classList.remove('pagination-done');
          document.querySelector("#pagination-current-progress").style.setProperty("--bar-width", (
            isFirstRender
              ? 0 
              : (
                Math.max((seen / nbHits) * 100, 2)
                  * (document.querySelector('#pagination-progress').offsetWidth / 100)
              )
          ) + "px");
          document.querySelector("#pagination-seen-hits").innerText = seen;
          document.querySelector("#pagination-total-hits").innerText = nbHits;
          document.querySelector("#pagination button").addEventListener('click', (e) => {
            e.preventDefault();
            refine(currentRefinement + 1);
          });
        }
      }
    )({
      container: '#pagination',
      hitsPerPage: 20,
    })
  ]);

  search.start();
};

startSRPSearch();