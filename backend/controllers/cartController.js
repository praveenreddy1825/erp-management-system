import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

// Helper to format and compute authoritative cart totals
const formatCartResponse = async (cart) => {
  if (!cart) {
    return {
      items: [],
      itemsCount: 0,
      cartTotal: 0,
    };
  }

  const populated = await Cart.findById(cart._id).populate({
    path: 'items.product',
    select: 'name SKU category price onHand reserved available stock',
  });

  if (!populated || !populated.items) {
    return {
      items: [],
      itemsCount: 0,
      cartTotal: 0,
    };
  }

  // Filter out any deleted products safely
  const validItems = populated.items.filter((item) => item.product != null);
  let cartTotal = 0;
  let itemsCount = 0;

  const items = validItems.map((item) => {
    const prod = item.product;
    const price = typeof prod.price === 'number' ? prod.price : 0;
    const lineTotal = item.quantity * price;
    cartTotal += lineTotal;
    itemsCount += item.quantity;

    return {
      product: {
        _id: prod._id,
        name: prod.name,
        SKU: prod.SKU,
        category: prod.category,
        price,
        available: typeof prod.available === 'number' ? prod.available : prod.stock || 0,
        onHand: typeof prod.onHand === 'number' ? prod.onHand : prod.stock || 0,
      },
      quantity: item.quantity,
      unitPrice: price,
      lineTotal,
    };
  });

  return {
    _id: cart._id,
    user: cart.user,
    items,
    itemsCount,
    cartTotal: Number(cartTotal.toFixed(2)),
    updatedAt: cart.updatedAt,
  };
};

// @desc    Get current authenticated customer's cart
// @route   GET /api/cart
// @access  Private (Customer, Admin, Sales_Manager)
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }
    const formatted = await formatCartResponse(cart);
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch cart' });
  }
};

// @desc    Add item to cart or increment quantity atomically
// @route   POST /api/cart/items
// @access  Private (Customer, Admin, Sales_Manager)
export const addItemToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const parsedQty = quantity !== undefined ? parseInt(quantity, 10) : 1;
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive integer greater than 0' });
    }
    if (parsedQty > 1000) {
      return res.status(400).json({ message: 'Quantity cannot exceed 1000 units' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Atomic update: increment quantity if product is already in the cart
    let cart = await Cart.findOneAndUpdate(
      { user: req.user._id, 'items.product': product._id },
      {
        $inc: { 'items.$.quantity': parsedQty },
      },
      { returnDocument: 'after' }
    );

    // If item was not already in cart, push new item atomically
    if (!cart) {
      cart = await Cart.findOneAndUpdate(
        { user: req.user._id },
        {
          $push: { items: { product: product._id, quantity: parsedQty } },
        },
        { returnDocument: 'after', upsert: true }
      );
    }

    const formatted = await formatCartResponse(cart);
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to add item to cart' });
  }
};

// @desc    Update specific item quantity in cart
// @route   PUT /api/cart/items/:productId
// @access  Private (Customer, Admin, Sales_Manager)
export const updateCartItemQty = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty)) {
      return res.status(400).json({ message: 'Quantity must be a valid integer' });
    }

    let cart;
    if (parsedQty <= 0) {
      // Remove item if quantity is zero or negative
      cart = await Cart.findOneAndUpdate(
        { user: req.user._id },
        { $pull: { items: { product: productId } } },
        { returnDocument: 'after' }
      );
    } else {
      if (parsedQty > 1000) {
        return res.status(400).json({ message: 'Quantity cannot exceed 1000 units' });
      }
      cart = await Cart.findOneAndUpdate(
        { user: req.user._id, 'items.product': productId },
        { $set: { 'items.$.quantity': parsedQty } },
        { returnDocument: 'after' }
      );
    }

    const formatted = await formatCartResponse(cart);
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update cart item quantity' });
  }
};

// @desc    Remove an item from the cart
// @route   DELETE /api/cart/items/:productId
// @access  Private (Customer, Admin, Sales_Manager)
export const removeCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { items: { product: productId } } },
      { returnDocument: 'after' }
    );
    const formatted = await formatCartResponse(cart);
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to remove cart item' });
  }
};

// @desc    Clear all items in current customer's cart
// @route   DELETE /api/cart
// @access  Private (Customer, Admin, Sales_Manager)
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [] } },
      { returnDocument: 'after', upsert: true }
    );
    const formatted = await formatCartResponse(cart);
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to clear cart' });
  }
};
