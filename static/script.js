// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    const logoutButton = document.getElementById('logout');
    const budgetForm = document.getElementById('budget-form');
    const expenseForm = document.getElementById('expense-form');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');

    // Event Listeners
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (showSignupLink) showSignupLink.addEventListener('click', () => toggleForms('signup'));
    if (showLoginLink) showLoginLink.addEventListener('click', () => toggleForms('login'));
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    if (budgetForm) budgetForm.addEventListener('submit', handleBudgetUpdate);
    if (expenseForm) expenseForm.addEventListener('submit', handleExpenseAdd);
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(-1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(1));

    // Check if user is already logged in
    if (localStorage.getItem(TOKEN_KEY)) {
        showDashboard();
        loadDashboardData();
        loadUserInfo();
    }
});

const TOKEN_KEY = 'expense_tracker_token';
const USERNAME_KEY = 'expense_tracker_username';
const ITEMS_PER_PAGE = 5;
let currentPage = 1;
let allExpenses = [];

// Form toggle
function toggleForms(form) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const dashboard = document.getElementById('dashboard');

    if (form === 'signup') {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        dashboard.classList.add('hidden');
    } else {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        dashboard.classList.add('hidden');
    }
}

// Auth functions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem(TOKEN_KEY, data.access_token);
            localStorage.setItem(USERNAME_KEY, data.username);
            showDashboard();
            loadDashboardData();
            updateUsernameDisplay();
        } else {
            const errorData = await response.text();
            console.error('Login error:', errorData);
            alert('Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login.');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const response = await fetch('/users/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, username, password }),
        });
        
        if (response.ok) {
            alert('Signup successful! Please login.');
            toggleForms('login');
        } else {
            const errorData = await response.text();
            console.error('Signup error:', errorData);
            alert('Signup failed: ' + errorData);
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('An error occurred during signup.');
    }
}

function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    toggleForms('login');
}

// Dashboard functions
function showDashboard() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
}

function updateUsernameDisplay() {
    const username = localStorage.getItem(USERNAME_KEY) || 'User';
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
        usernameDisplay.textContent = username;
    }
}

async function loadUserInfo() {
    try {
        const response = await fetch('/users/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            },
        });

        if (response.ok) {
            const userData = await response.json();
            localStorage.setItem(USERNAME_KEY, userData.username);
            updateUsernameDisplay();
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

async function loadDashboardData() {
    await Promise.all([
        loadExpenses(),
        loadSummary()
    ]);
}

async function handleBudgetUpdate(e) {
    e.preventDefault();
    const budget = document.getElementById('budget').value;

    try {
        const response = await fetch('/users/budget', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ budget: parseFloat(budget) }),
        });
        
        if (response.ok) {
            const data = await response.json();
            alert('Budget updated successfully!');
            // Force reload summary data
            await loadSummary();
            // Clear the input field
            document.getElementById('budget').value = '';
        } else {
            const errorData = await response.text();
            console.error('Budget update error:', errorData);
            alert('Failed to update budget: ' + errorData);
        }
    } catch (error) {
        console.error('Budget update error:', error);
        alert('An error occurred while updating budget.');
    }
}

async function handleExpenseAdd(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;

    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount greater than zero.');
        return;
    }

    try {
        // Check budget first
        const summaryResponse = await fetch('/expenses/summary', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            },
        });
        
        if (summaryResponse.ok) {
            const summary = await summaryResponse.json();
            const currentTotal = summary.total_spent || 0;
            const budget = summary.monthly_budget || 0;
            
            if (budget > 0) {
                const newTotal = currentTotal + amount;
                if (newTotal > budget) {
                    const overBudget = newTotal - budget;
                    alert(`Cannot add expense: Would exceed monthly budget by $${overBudget.toFixed(2)}\n\nCurrent total: $${currentTotal.toFixed(2)}\nBudget: $${budget.toFixed(2)}`);
                    return;
                }
            }
        }

        // Add expense if within budget
        const response = await fetch('/expenses/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                description: description,
                category: category
            }),
        });

        // Clear form and reload data
        document.getElementById('amount').value = '';
        document.getElementById('description').value = '';
        document.getElementById('category').value = '';
        
        await loadExpenses();
        await loadSummary();
        
        alert('Expense added successfully!');
    } catch (error) {
        console.error('Add expense error:', error);
        alert('Error adding expense. Please try again.');
    }
}

async function loadExpenses() {
    try {
        const response = await fetch('/expenses/', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            },
        });

        if (response.ok) {
            allExpenses = await response.json();
            // Sort expenses by date (newest first)
            allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
            displayExpenses();
        } else {
            console.error('Failed to load expenses:', await response.text());
        }
    } catch (error) {
        console.error('Load expenses error:', error);
    }
}

async function loadSummary() {
    try {
        const response = await fetch('/expenses/summary', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            },
        });

        if (response.ok) {
            const summary = await response.json();
            displaySummary(summary);
        } else {
            console.error('Failed to load summary:', await response.text());
        }
    } catch (error) {
        console.error('Load summary error:', error);
    }
}

function displayExpenses() {
    const expensesList = document.getElementById('expenses-list');
    if (!expensesList) return;
    
    expensesList.innerHTML = '';

    if (allExpenses.length === 0) {
        expensesList.innerHTML = '<tr><td colspan="4">No expenses found</td></tr>';
        document.getElementById('prev-page').disabled = true;
        document.getElementById('next-page').disabled = true;
        document.getElementById('page-info').textContent = 'Page 0 of 0';
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(allExpenses.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;
    
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = Math.min(start + ITEMS_PER_PAGE, allExpenses.length);
    const currentExpenses = allExpenses.slice(start, end);

    // Update pagination controls
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;

    // Display current page of expenses
    currentExpenses.forEach(expense => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(expense.date).toLocaleDateString()}</td>
            <td>${expense.description}</td>
            <td>${expense.category}</td>
            <td>$${expense.amount.toFixed(2)}</td>
        `;
        expensesList.appendChild(row);
    });
}

function changePage(direction) {
    currentPage += direction;
    displayExpenses();
}

function displaySummary(summary) {
    const totalSpent = document.getElementById('total-spent');
    const monthlyBudget = document.getElementById('monthly-budget');
    const remainingBudget = document.getElementById('remaining-budget');
    
    if (totalSpent) totalSpent.textContent = `$${summary.total_spent.toFixed(2)}`;
    if (monthlyBudget) monthlyBudget.textContent = summary.monthly_budget ? 
        `$${summary.monthly_budget.toFixed(2)}` : 'Not set';
    if (remainingBudget) remainingBudget.textContent = summary.remaining_budget ? 
        `$${summary.remaining_budget.toFixed(2)}` : 'N/A';
}