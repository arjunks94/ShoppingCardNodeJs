
function addToCart(proId) {
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html()
                count = parseInt(count) + 1
                $("#cart-count").html(count)
            }
            cartAddNotification('Item Added to Cart');
            // alert(response)
        }
    })
}

document.querySelectorAll('.button').forEach(button => button.addEventListener('click', e => {
    if (!button.classList.contains('loading')) {

        button.classList.add('loading');

        setTimeout(() => button.classList.remove('loading'), 3700);

    }
    e.preventDefault();
}));

function updateQuantity(proId, userId) {
    let quantity = parseInt(document.getElementById('quantity-' + proId).value);

    $.ajax({
        url: '/change-product-quantity',
        data: {
            user: userId,
            product: proId,
            quantity: quantity
        },
        method: 'post',
        success: (response) => {
            if (response.status) {
                document.getElementById('quantity-' + proId).value = response.quantity; // Update the quantity input
                document.getElementById('product-' + proId).querySelector('td:nth-child(5)').innerHTML = '$' + response.productTotal;
                document.getElementById('total').innerHTML = '$' + response.total; // Update the total

                showUpdatePopup('Quantity updated');
            } else {
                console.error('Error response:', response);
                alert(response.error);
            }
        },
        error: (xhr, status, error) => {
            console.error('Error updating quantity:', error);
        }
    });
}


function removeProduct(userId, proId) {
    console.log('AJAX removeProduct called with:', { user: userId, product: proId });

    $.ajax({
        url: '/remove-product',
        method: 'post',
        data: {
            user: userId,
            product: proId
        },
        success: (response) => {
            if (response.status) {
                $('#product-' + proId).fadeOut(500, function () {
                    $(this).remove();
                    // Update the total after the product is removed
                    $('#total').text('$' + response.total);
                });
                showRemovePopup('Product removed');
            } else {
                console.error('Error response:', response);
                alert(response.error);
            }
        },
        error: (xhr, status, error) => {
            console.error('Error removing product:', error);
        }
    });
}

// document.addEventListener('DOMContentLoaded', () => {
//     // Fetch cart items and populate order summary
//     fetch('/cart')
//         .then(response => response.json())
//         .then(cartItems => {
//             const orderSummaryBody = document.getElementById('order-summary-body');
//             if (!orderSummaryBody) {
//                 console.error('Order summary body element not found in the DOM.');
//                 return;
//             }

//             let totalAmount = 0;

//             cartItems.forEach(item => {
//                 totalAmount += item.total;

//                 const row = document.createElement('tr');
//                 row.innerHTML = `
//                     <th scope="row"><img src="/product-images/${item.item}.jpg" alt="product-img" title="product-img" class="avatar-lg rounded"></th>
//                     <td>
//                         <h5 class="font-size-16 text-truncate"><a href="#" class="text-dark">${item.name}</a></h5>
//                         <p class="text-muted mb-0 mt-1">$ ${item.price} x QTY : ${item.quantity}</p>
//                     </td>
//                     <td>$ ${item.total}</td>
//                 `;

//                 orderSummaryBody.appendChild(row);
//             });

//             const totalRow = document.createElement('tr');
//             totalRow.classList.add('bg-light');
//             totalRow.innerHTML = `
//                 <td colspan="2">
//                     <h5 class="font-size-14 m-0">Total:</h5>
//                 </td>
//                 <td>
//                     $ ${totalAmount}
//                 </td>
//             `;
//             orderSummaryBody.appendChild(totalRow);
//         });

//     // Handle place order button click
//     document.getElementById('place-order-btn').addEventListener('click', (event) => {
//         event.preventDefault();

//         const formData = new FormData(document.querySelector('form'));
//         const orderData = Object.fromEntries(formData.entries());
//         orderData.paymentMethod = document.querySelector('input[name="pay-method"]:checked').value;

//         const orderNumberElement = document.getElementById('orderNumber');
//         if (orderNumberElement) {
//             orderData.orderNumber = orderNumberElement.value;  // Add the generated order number to the order data
//         } else {
//             console.error('Order number element not found when placing the order.');
//         }

//         // console.log(orderData);

//         fetch('/order/placeOrder', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(orderData)
//         })
//             .then(response => response.json())
//             .then(data => {
//                 if (data.codSuccess) {
//                     showPlacedOrderPopup(orderData.orderNumber);
//                 } else {
//                     razorpayPayment(orderData, data);
//                 }
//             })
//             .catch(error => {
//                 console.error('Error placing order:', error);
//                 alert('An error occurred while placing the order. Please try again.');
//             });
//     });
// });

// function razorpayPayment (orderData, order) {
//     var options = {
//         "key": "rzp_test_LsB6ulhtx6M1l7", // Enter the Key ID generated from the Dashboard
//         "amount": order.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
//         "currency": "INR",
//         "name": "SHOPPING CART PROJECT", //your business name
//         "description": "Test Transaction",
//         "image": "https://example.com/your_logo",
//         "order_id": order.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
//         "handler": function (response) {
//             // alert(response.razorpay_payment_id);
//             // alert(response.razorpay_order_id);
//             // alert(response.razorpay_signature)

//             verifyPayment(response,order)
//         },
//         "prefill": { //We recommend using the prefill parameter to auto-fill customer's contact information, especially their phone number
//             "name": orderData.name, //your customer's name
//             "email": orderData.email,
//             "contact": orderData.phone  //Provide the customer's phone number for better conversion rates 
//         },
//         "notes": {
//             "address": "Shopping Cart Project Test"
//         },
//         "theme": {
//             "color": "#f29c07"
//         }
//     };
//     var rzp1 = new Razorpay(options);
//     rzp1.open();
    
// }

// function verifyPayment(payment,order){
//     $.ajax({
//         url:'/verify-payment',
//         data:{
//             payment,
//             order
//         },
//         method: 'post',
//         success: (response)=>{
//             if(response.status){
//                 showOnlineOrderPopup(payment.razorpay_payment_id);
//             }else{
//                 alert("Payment failed")
//             }
            
//         }
//     })
// }

function showRemovePopup(message) {
    const popup = $('<div class="RemovePopup-notification"></div>').text(message);
    $('body').append(popup);

    // Show the popup
    popup.fadeIn(300);

    // Set timeout to fade out and remove the popup
    setTimeout(() => {
        popup.fadeOut(500, () => popup.remove());
    }, 1000);
}

function cartAddNotification(message) {
    const popup = $('<div class="cart-notification"></div>').text(message);
    $('body').append(popup);

    // Show the popup
    popup.fadeIn(300);

    // Set timeout to fade out and remove the popup
    setTimeout(() => {
        popup.fadeOut(500, () => popup.remove());
    }, 1000);
}

function showUpdatePopup(message) {
    const popup = $('<div class="UpdatePopup-notification"></div>').text(message);
    $('body').append(popup);

    // Show the popup
    popup.fadeIn(300);

    // Set timeout to fade out and remove the popup
    setTimeout(() => {
        popup.fadeOut(500, () => popup.remove());
    }, 1000);
}

// function showPlacedOrderPopup(orderNumber) {
//     const popup = $('<div class="Placed-Order-notification"></div>');
//     const tickIcon = $('<div class="tick-icon"><i class="fas fa-check"></i></div>');
//     const message = $('<div class="notification-text"></div>').text('Order has been placed successfully!');
//     const orderNumberText = $('<div class="order-number-text"></div>').text(`Order Number: ${orderNumber}`);
//     const button = $('<button class="view-orders-button">View My Orders</button>');

//     button.on('click', () => {
//         window.location.href = '/placed-orders'; // Redirect to the orders page
//     });

//     popup.append(tickIcon, message, orderNumberText, button);
//     $('body').append(popup);

//     // Show the popup
//     popup.fadeIn(300);

//     // Set timeout to fade out and remove the popup
//     setTimeout(() => {
//         popup.fadeOut(500, () => {
//             popup.remove();
//             window.location.href = '/'; // Redirect to the home page
//         });
//     }, 7000); // Adjust the timeout as needed

//     // Animation for tick icon
//     tickIcon.delay(300).fadeIn(300).delay(5000).fadeOut(500); // Fade in and out with delay

//     // Customize tick icon styles
//     tickIcon.find('i').addClass('fa fa-check').css({
//         fontSize: '60px'
//     });
// }

// function showOnlineOrderPopup(razorpay_payment_id) {
//     const popup = $('<div class="Placed-Order-notification"></div>');
//     const tickIcon = $('<div class="tick-icon"><i class="fas fa-check"></i></div>');
//     const message = $('<div class="notification-text"></div>').text('Payemetn is Success. Order has been placed successfully!');
//     const orderNumberText = $('<div class="order-number-text"></div>').text(`Payment ID: ${razorpay_payment_id}`);
//     const button = $('<button class="view-orders-button">View My Orders</button>');

//     button.on('click', () => {
//         window.location.href = '/placed-orders'; // Redirect to the orders page
//     });

//     popup.append(tickIcon, message, orderNumberText, button);
//     $('body').append(popup);

//     // Show the popup
//     popup.fadeIn(300);

//     // Set timeout to fade out and remove the popup
//     setTimeout(() => {
//         popup.fadeOut(500, () => {
//             popup.remove();
//             window.location.href = '/'; // Redirect to the home page
//         });
//     }, 7000); // Adjust the timeout as needed

//     // Animation for tick icon
//     tickIcon.delay(300).fadeIn(300).delay(5000).fadeOut(500); // Fade in and out with delay

//     // Customize tick icon styles
//     tickIcon.find('i').addClass('fa fa-check').css({
//         fontSize: '60px'
//     });
// }

// function showPlacedOrderPopup(message) {
//     const popup = $('<div class="Placed-Order-notification"></div>').text(message);
//     $('body').append(popup);

//     // Show the popup
//     popup.fadeIn(300);

//     // Set timeout to fade out and remove the popup
//     setTimeout(() => {
//         popup.fadeOut(500, () => popup.remove());
//     }, 1000);
// }

