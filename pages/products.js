import { useRouter } from 'next/router';
import Button from '../components/button';
import ProductCard from '../components/productCard';
import CartModal from '../components/cartModal';
import { useState } from 'react';
import Image from 'next/image';
import * as db from './api/database';


export async function getServerSideProps() {
    const products = await db.getAllProductsData();

    return {
        props: {
            products,
        }
    }
}

export default function Products({products}) {
    const [formData, updateFormData] = useState({});
    const [cart, updateCart] = useState({});
    const [cartKey, updateCartKey] = useState('');
    const [editCart, updateEditCart] = useState({});
    const [itemCosts, updateItemCosts] = useState({});
    const [cartModalState, updateCartModalState] = useState(false);

    const router = useRouter();

    const handleInputChange = (e) => {
        updateFormData({
            ...formData,
            [e.target.name]: e.target.value.trim(),
        })
    }

    const addToCart = (e) => {
        e.preventDefault();

        const productId = e.currentTarget.name;
        const itemQuantity = formData[productId];
        if (!validateCartItemQty(itemQuantity)) return;
        const itemCost = e.currentTarget.dataset.price;
        
        clearInput(productId);

        const currentCartItem = cart[productId];
        if (currentCartItem) {
            updateCart({
                ...cart,
                [productId]: parseInt(currentCartItem) + parseInt(itemQuantity),
            })
        }
        else {
            updateCart({
                ...cart,
                [productId]: formData[productId],
            })
        }

        updateCartKey(Math.random());
        
        updateItemCosts({ ...itemCosts, [productId]: itemCost * itemQuantity });

    }

    const clearInput = (productId) => {
        document.querySelector(`#productCard input[name="${productId}"]`).value = '';
    }

    const goToCheckout = () => {
        router.push({
            pathname: '/checkout',
            query: {
                ...cart,
            }
        });
    }

    const openCartModal = () => {
        updateCartModalState('open');
    }

    const closeCartModal = () => {
        if  (cartModalState) {
            updateCartModalState('closed');
        }
    }

    const editCartItem = (e, productId, itemQuantity) => {
        if (e) {
            productId = e.currentTarget.name;
            itemQuantity = e.currentTarget.value;
        }

        updateEditCart({
            ...editCart,
            [productId]: itemQuantity,
        })
    }

    const updateCartFormEdit = (e) => {
        if (e) e.preventDefault();

        for (const key in editCart) {
            if (!validateCartItemQty(editCart[key])) return;
        }

        updateCart({
            ...cart,
            ...editCart,
        });

        updateCartKey(Math.random());

        let updatedCosts = {};
        for (const key in editCart) {
            updatedCosts[key] = editCart[key] * products.find(product => product.product_id == key.replace('product_', '')).product_price;
        }

        updateItemCosts({ ...itemCosts, ...updatedCosts });
    }

    const changeCartItemQty = (productId, qtyChange) => {
        const targetInput = document.querySelector(`#cartModal input[name="${productId}"]`);
        const currentQty = parseInt(targetInput.value);
        const newQty = currentQty + qtyChange;
        if (newQty < 1) {
            document.querySelector(`#cartModal [data-product_id="${productId}"]`).classList.remove('hidden');
            if (document.querySelector(`#cartModal [data-product_id="${productId}"]`).classList.contains('animate-closeX')) {
                document.querySelector(`#cartModal [data-product_id="${productId}"]`).classList.remove('animate-closeX');
            }
            document.querySelector(`#cartModal [data-product_id="${productId}"]`).classList.add('animate-openX');
            return;
        }
        targetInput.value = newQty;

        editCartItem(null, productId, newQty);
    }

    const validateCartItemQty = (qty) => {
        if (!Number.isInteger(Number(qty))) {
            alert('Please enter a valid quantity');
            return false;
        };
        if (qty <= 0) {
            alert('Quantity must be greater than 0');
            return false;
        }
        return true;
    }

    const removeItemFromCart = (productId) => {
        let updatedCart = { ...cart };
        delete updatedCart[productId];
        let updatedEditCart = { ...editCart };
        delete updatedEditCart[productId];

        updateCart(updatedCart);
        updateEditCart(updatedEditCart);
        updateItemCosts({ ...itemCosts, [productId]: 0 });
    }

    return (
        <div className="font-source-sans-pro h-screen flex flex-col">
            <div className="flex flex-1 flex-col overflow-auto">
                <div>
                    <h2 className="font-bold text-5xl text-center pt-10 pb-5">PRODUCTS</h2>
                    <div className="absolute right-0 top-0 px-16 py-10 z-10">
                        <div className="relative">
                            <Button
                                type="secondary"
                                img="/images/icons/shopping_cart.png"
                                clickHandler={openCartModal}
                            >
                                View Cart
                            </Button>
                            {Object.keys(cart).length ? (
                            <div className={`bg-default-900 text-default-100 font-bold text-center 
                            rounded-full absolute px-[0.4rem] h-5 top-0 right-0 
                            translate-x-2 -translate-y-2 animate-popIn ${cartModalState === 'open' ? 'animate-popOut' : 'animate-popIn'}
                            `}>
                                <p className="-translate-y-0.5 animate-delayAppear">{Object.keys(cart).length}</p>
                            </div>
                            ) : null}
                        </div>
                    </div>
                    <CartModal 
                        cartModalState={cartModalState}
                        closeCartModal={closeCartModal}
                        editCartItem={editCartItem}
                        updateCartFormEdit={updateCartFormEdit}
                        changeCartItemQty={changeCartItemQty}
                        removeItemFromCart={removeItemFromCart}
                        itemCosts={itemCosts}
                        cartKey={cartKey}
                        cart={cart}
                        products={products}
                    />
                </div>
                
                <form>
                    <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                        {products.map(product => 
                            <ProductCard 
                                addToCart={addToCart} 
                                handleInputChange={handleInputChange}
                                type="number" 
                                fieldStyle="productInput" 
                                measured_per_text={product.measured_per_text} 
                                price={product.product_price} 
                                imgPath={product.product_img_path} 
                                text={product.product_name} 
                                product_description={product.product_description}
                                placeholder="How many?" 
                                name={"product_" + product.product_id} 
                                key={product.product_id}
                            />
                        )}
                    </div>
                </form>
            </div>
            <footer className="bg-default-100 flex flex-row justify-between items-center h-24 shadow-3xl">
                <p className="font-bold text-3xl px-12">
                    Total Cost: ${(Object.values(itemCosts).length ? Object.values(itemCosts).reduce((a, b) => a + b) : 0).toFixed(2)}
                </p>
                <div className="px-12">
                    <Button 
                        type="primary" 
                        clickHandler={goToCheckout}
                        img="/images/icons/shopping_cart.png"
                        >
                        CHECKOUT
                    </Button>
                </div>
            </footer>
        </div>
    )
}