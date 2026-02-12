const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const category = document.getElementById('category');
const modal = document.getElementById('modal');
const addBtn = document.getElementById('add-btn');
const closeBtn = document.querySelector('.close-btn');
const submitBtn = form.querySelector('.btn');

// --- KONFIGURASI ---
// REPLACE THIS WITH YOUR OWN DEPLOYED GOOGLE APPS SCRIPT URL
const API_URL = 'https://script.google.com/macros/s/AKfycbzfAgqYbhWAhLNlaVIMwiF2QgfAzgb9C13JfsNXhHJZBnq_8qY-Rm78ahKeSzJnh8kq/exec';
// -------------------

// Icon mapping
const categoryIcons = {
    'Makanan': 'fa-solid fa-utensils',
    'Minuman': 'fa-solid fa-mug-hot',
    'Belanja': 'fa-solid fa-basket-shopping',
    'Transportasi': 'fa-solid fa-bus',
    'Hiburan': 'fa-solid fa-film',
    'Tagihan': 'fa-solid fa-file-invoice-dollar',
    'Lainnya': 'fa-solid fa-money-bill-transfer'
};

let transactions = [];

// Fetch transactions from Google Sheets
async function getTransactions() {
    if (API_URL === 'PASTE_YOUR_WEB_APP_URL_HERE') {
        alert('Please configure your API_URL in script.js first!');
        return;
    }

    // Show loading indicator
    list.innerHTML = '<p style="text-align:center; margin-top:20px;">Loading data...</p>';

    try {
        const res = await fetch(API_URL);
        const data = await res.json();

        transactions = data;
        init();
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p style="text-align:center; color:red; margin-top:20px;">Failed to load data.</p>';
    }
}

// Add transaction functionality
async function addTransaction(e) {
    e.preventDefault();

    if (text.value.trim() === '' || amount.value.trim() === '') {
        alert('Please add a text and amount');
        return;
    }

    const transaction = {
        id: generateID(),
        text: text.value,
        amount: +amount.value,
        category: category.value,
        date: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    // Optimistic UI Update (Show immediately)
    transactions.push(transaction);
    addTransactionDOM(transaction);
    updateValues();

    // Close modal immediately
    toggleModal();
    text.value = '';
    amount.value = '';

    // Background Sync
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Saving...';
    submitBtn.disabled = true;

    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'add',
                transaction: transaction
            })
        });
    } catch (err) {
        console.error('Failed to save', err);
        alert('Failed to save to Google Sheets (Network Error)');
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

// Remove transaction by ID
async function removeTransaction(id) {
    // Optimistic UI Update
    transactions = transactions.filter(transaction => transaction.id !== id);
    init();

    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete',
                id: id
            })
        });
    } catch (err) {
        console.error('Failed to delete', err);
        alert('Failed to delete from Google Sheets');
    }
}

// Generate random ID
function generateID() {
    return Math.floor(Math.random() * 100000000);
}

// Add transactions to DOM list
function addTransactionDOM(transaction) {
    // Get sign
    const sign = transaction.amount < 0 ? '-' : '+';
    const itemClass = transaction.amount < 0 ? 'minus' : 'plus';

    const item = document.createElement('li');

    // Decide Icon
    let iconClass = 'fa-solid fa-money-bill-transfer';

    // Use category if available
    if (transaction.category && categoryIcons[transaction.category]) {
        iconClass = categoryIcons[transaction.category];
    } else {
        // Fallback
        if (transaction.text.toLowerCase().includes('makan') || transaction.text.toLowerCase().includes('food')) {
            iconClass = 'fa-solid fa-utensils';
        } else if (transaction.text.toLowerCase().includes('belanja') || transaction.text.toLowerCase().includes('shopping')) {
            iconClass = 'fa-solid fa-basket-shopping';
        } else if (transaction.text.toLowerCase().includes('gaji') || transaction.text.toLowerCase().includes('salary')) {
            iconClass = 'fa-solid fa-wallet';
        }
    }

    item.classList.add(itemClass);
    item.innerHTML = `
    <div class="txn-icon">
        <i class="${iconClass}"></i>
    </div>
    <div class="txn-info">
        <h4>${transaction.text}</h4>
        <small>${transaction.category ? transaction.category + ' • ' : ''}${transaction.date || 'Today'}</small>
    </div>
    <span class="txn-amount">${sign}Rp ${Math.abs(transaction.amount).toLocaleString('id-ID')}</span>
    <button class="delete-btn" onclick="removeTransaction(${transaction.id})">x</button>
  `;

    list.appendChild(item);
}

// Update the balance, income and expense
function updateValues() {
    const amounts = transactions.map(transaction => transaction.amount);

    const total = amounts.reduce((acc, item) => (acc += item), 0);

    const income = amounts
        .filter(item => item > 0)
        .reduce((acc, item) => (acc += item), 0);

    const expense = (
        amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) *
        -1
    );

    balance.innerText = `Rp ${total.toLocaleString('id-ID')}`;
    money_plus.innerText = `+Rp ${income.toLocaleString('id-ID')}`;
    money_minus.innerText = `-Rp ${expense.toLocaleString('id-ID')}`;
}

// Init app
function init() {
    list.innerHTML = '';
    transactions.forEach(addTransactionDOM);
    updateValues();
}

// Modal handling
function toggleModal() {
    modal.classList.toggle('show');
}

addBtn.addEventListener('click', toggleModal);
document.getElementById('desktop-add-btn').addEventListener('click', toggleModal);
closeBtn.addEventListener('click', toggleModal);
window.addEventListener('click', (e) => {
    if (e.target == modal) {
        toggleModal();
    }
});

form.addEventListener('submit', addTransaction);

// Initial Fetch
getTransactions();
