const APP_ID = 'Q6N17K5UHW';
const API_KEY = 'ee288cd2b95756a7c2311c5a88f7af07';
const INDEX = 'ecommerce_ns_prod';
const PAGE_SRP = 'index.html';
const PAGE_PDP = 'pdp.html';

const renderHit = hit => `
  <a
    class="hit" 
    data-object-id="${hit.objectID}" 
    href="${PAGE_PDP}?objectID=${hit.objectID}"
  >
    <img
      src="https://fxqklbpngldowtbkqezm.supabase.co/storage/v1/object/public/product-images/${hit.image}"
      alt="${hit.name}"
    />
    <h3>${hit.name}</h3>
    ${hit.price ? 
      `<button data-objectID="${hit.objectID}" class="hit-add-to-cart">Add to cart for $${hit.price.toFixed(2)}</button>` : 
      `<p class="hit-out-of-stock">Out of stock</p>`
    }
  </a>
`;

const carousel = (widget, container, title, objectID) => widget({
  container,
  objectIDs: [objectID],
  cssClasses: {
    root: 'carousel',
    list: 'carousel-products',
    item: 'al-Product',
  },
  templates: {
    header: () => `<h2 class="carousel-title">${title}</h2>`,
    item: renderHit
  },
});

const updateCarouselHandles = (carousel) => {
  if (!carousel) return;
  let p = carousel.querySelector('.carousel-products');
  if (!p) return;
  
  
  const canScroll = p.scrollWidth > p.clientWidth;
  const isScrolledToEnd = p.scrollLeft + p.clientWidth >= p.scrollWidth;
  
  if (!carousel.querySelector('.carousel-handle--left')) {
    const h = document.createElement('div');
    h.classList.add('carousel-handle', 'carousel-handle--left');
    h.innerHTML = '&#8592;';
    carousel.appendChild(h);
  }
  if (!carousel.querySelector('.carousel-handle--right')) {
    const h = document.createElement('div');
    h.classList.add('carousel-handle', 'carousel-handle--right');
    h.innerHTML = '&#8594;';
    carousel.appendChild(h);
  }

  carousel.querySelector('.carousel-handle--left').classList.toggle(
    'u-hidden',
    !p.scrollLeft || !canScroll
  );
  carousel.querySelector('.carousel-handle--right').classList.toggle(
    'u-hidden',
    isScrolledToEnd || !canScroll
  );
};