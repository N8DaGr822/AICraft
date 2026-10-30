// Discovery: Filter existing cards; the complete catalog remains readable without JavaScript.
const search = document.querySelector('#search');
const category = document.querySelector('#category');
const sort = document.querySelector('#sort');
const catalog = document.querySelector('#catalog');
const cards = [...catalog.children];
function update() {
    const query = search.value.trim().toLocaleLowerCase();
    const sorted = [...cards].sort((a, b) => {
        const name = () => a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
        if (sort.value === 'recent') return b.dataset.date.localeCompare(a.dataset.date) || name();
        if (sort.value === 'category') return a.dataset.category.localeCompare(b.dataset.category) || name();
        return name();
    });
    let count = 0;
    for (const card of sorted) {
        card.hidden = !(card.dataset.search.toLocaleLowerCase().includes(query) && (!category.value || card.dataset.category === category.value));
        if (!card.hidden) count++;
        catalog.append(card);
    }
    document.querySelector('#results').textContent = `${count} application${count === 1 ? '' : 's'}${sort.value === 'recent' ? '. Entries without a recorded date appear last, alphabetically.' : ''}`;
    document.querySelector('#empty').hidden = count !== 0;
}
search.addEventListener('input', update);
category.addEventListener('change', update);
sort.addEventListener('change', update);
