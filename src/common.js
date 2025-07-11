const APP_ID = 'U9UXVSI686';
const API_KEY = '9456bf3355169106984bd4528f41ee73';
const INDEX = 'prod_ECOM';
const PAGE_SRP = 'index.html';
const PAGE_PDP = 'pdp.html';

const renderHit = hit => `
  <a
    class="hit" 
    data-object-id="${hit.objectID}" 
    href="${PAGE_PDP}?objectID=${hit.objectID}"
  >
    <img
      src=${hit.image_urls[0]}
      alt=${hit.name}
    />
    <h3>${hit.name}</h3>
    <button class="hit-add-to-cart">Add to cart for ${ getPrice(hit.price.value, hit.price.currency) }</button>
  </a>
`;

const getPrice = (value, currency) => (
  (new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    trailingZeroDisplay: 'stripIfInteger'
  })).format(value)
);

const addRecentlyViewed = objectID => {
  const viewed = JSON.parse(sessionStorage.getItem('recentlyViewed')) || [];
  viewed.unshift(objectID);
  sessionStorage.setItem(
    'recentlyViewed',
    JSON.stringify([...new Set(viewed.slice(0, 8))])
  );
}

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
  
  if (!t.querySelector('.carousel-handle--left')) {
    const h = document.createElement('div');
    h.classList.add('carousel-handle', 'carousel-handle--left');
    h.innerHTML = '&#8592;';
    carousel.appendChild(h);
  }
  if (!t.querySelector('.carousel-handle--right')) {
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