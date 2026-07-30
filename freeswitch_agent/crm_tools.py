"""
CRM Tool Handlers — Direct function handlers cho Pipecat LLM function calling
===============================================================================
Các tool handler để tra cứu thông tin khách hàng, đơn hàng, sản phẩm,
và câu hỏi thường gặp từ CRM database nội bộ (SQLite).

Mỗi handler là một direct function cho Pipecat, được đưa vào
LLMContext(tools=[...]) để LLM có thể gọi khi cần.

Các tool:
  - lookup_customer(phone)     → thông tin khách hàng + dư nợ
  - check_orders(phone)        → đơn hàng gần đây
  - search_product(query)      → sản phẩm theo tên/danh mục
  - search_faq(query)          → câu hỏi thường gặp
  - save_faq(question, answer) → học hỏi từ cuộc gọi

Cách dùng:
    from crm_db import get_crm_db
    from crm_tools import create_crm_tools

    crm_db = get_crm_db()
    tools = create_crm_tools(crm_db)
    context = LLMContext(tools=tools)
"""

from loguru import logger


def create_crm_tools(crm_db):
    """Factory: tạo list các direct function handler cho CRM.

    Args:
        crm_db: CRMDB instance (từ crm_db.get_crm_db()).

    Returns:
        List of direct function handlers để đưa vào LLMContext(tools=[...]).
    """

    async def lookup_customer(params, phone: str):
        """Tra cứu thông tin khách hàng theo số điện thoại.

        Gọi hàm này khi khách hàng yêu cầu xem thông tin cá nhân,
        kiểm tra tài khoản, dư nợ, điểm thưởng, hoặc khi cần xác
        định khách hàng là ai.

        Args:
            phone: Số điện thoại khách hàng (vd: "0901234567")
        """
        logger.info(f"🔍 CRM lookup: phone={phone}")

        try:
            customer = crm_db.get_customer_by_phone(phone)
            if customer:
                result = {
                    "found": True,
                    "name": customer["name"],
                    "phone": customer["phone"],
                    "email": customer["email"],
                    "address": customer["address"],
                    "debt": customer["debt"],
                    "total_spent": customer["total_spent"],
                    "loyalty_points": customer["loyalty_points"],
                    "note": customer["note"],
                }
                logger.info(f"✅ CRM found: {customer['name']} ({phone})")
            else:
                result = {"found": False, "phone": phone}
                logger.info(f"❌ CRM not found: {phone}")

            await params.result_callback(result)

        except Exception as e:
            logger.error(f"❌ CRM lookup error: {e}")
            await params.result_callback({"found": False, "error": str(e)})

    async def check_orders(params, phone: str):
        """Kiểm tra đơn hàng của khách hàng theo số điện thoại.

        Gọi hàm này khi khách hàng hỏi về tình trạng đơn hàng,
        lịch sử mua hàng, hoặc muốn kiểm tra đơn đã đặt.

        Args:
            phone: Số điện thoại khách hàng (vd: "0901234567")
        """
        logger.info(f"🔍 CRM orders: phone={phone}")

        try:
            orders = crm_db.get_orders_by_phone(phone)
            if orders:
                result = {
                    "found": True,
                    "phone": phone,
                    "orders": [
                        {
                            "product": o["product_name"],
                            "quantity": o["quantity"],
                            "amount": o["amount"],
                            "status": o["status"],
                            "date": o["order_date"],
                        }
                        for o in orders
                    ],
                }
                logger.info(f"✅ CRM orders found: {len(orders)} orders for {phone}")
            else:
                result = {"found": False, "phone": phone}
                logger.info(f"❌ CRM no orders for {phone}")

            await params.result_callback(result)

        except Exception as e:
            logger.error(f"❌ CRM orders error: {e}")
            await params.result_callback({"found": False, "error": str(e)})

    async def search_product(params, query: str):
        """Tìm kiếm sản phẩm theo tên hoặc danh mục.

        Gọi hàm này khi khách hàng hỏi về sản phẩm, giá cả,
        tình trạng tồn kho, hoặc muốn tư vấn mua hàng.

        Args:
            query: Từ khoá tìm kiếm (vd: "iPhone", "laptop", "tai nghe")
        """
        logger.info(f"🔍 CRM product search: query={query}")

        try:
            products = crm_db.search_products(query)
            if products:
                result = {
                    "found": True,
                    "query": query,
                    "products": [
                        {
                            "name": p["name"],
                            "category": p["category"],
                            "price": p["price"],
                            "stock": p["stock"],
                            "description": p["description"],
                        }
                        for p in products
                    ],
                }
                logger.info(f"✅ CRM products found: {len(products)} for '{query}'")
            else:
                result = {"found": False, "query": query}
                logger.info(f"❌ CRM no products for '{query}'")

            await params.result_callback(result)

        except Exception as e:
            logger.error(f"❌ CRM product search error: {e}")
            await params.result_callback({"found": False, "error": str(e)})

    async def search_faq(params, query: str):
        """Tìm kiếm câu hỏi thường gặp.

        Gọi hàm này khi khách hàng hỏi một câu hỏi mà bạn không
        chắc chắn câu trả lời, để kiểm tra xem đã có câu trả lời
        trong cơ sở kiến thức chưa.

        Args:
            query: Từ khoá tìm kiếm (vd: "đổi trả", "bảo hành", "trả góp")
        """
        logger.info(f"🔍 CRM FAQ search: query={query}")

        try:
            faqs = crm_db.search_faq(query)
            if faqs:
                result = {
                    "found": True,
                    "query": query,
                    "results": [
                        {
                            "question": f["question"],
                            "answer": f["answer"],
                            "category": f["category"],
                        }
                        for f in faqs
                    ],
                }
                logger.info(f"✅ CRM FAQ found: {len(faqs)} for '{query}'")
            else:
                result = {"found": False, "query": query}
                logger.info(f"❌ CRM no FAQ for '{query}'")

            await params.result_callback(result)

        except Exception as e:
            logger.error(f"❌ CRM FAQ search error: {e}")
            await params.result_callback({"found": False, "error": str(e)})

    async def save_faq(params, question: str, answer: str):
        """Lưu câu hỏi và câu trả lời mới vào cơ sở kiến thức.

        Gọi hàm này khi khách hàng hỏi một câu hỏi mới mà bạn
        không tìm thấy câu trả lời trong FAQ hiện có. Hàm sẽ lưu
        lại để lần sau có thể trả lời được.

        Args:
            question: Câu hỏi của khách hàng
            answer: Câu trả lời tương ứng (ngắn gọn, chính xác)
        """
        logger.info(f"📝 CRM save FAQ: q={question[:60]}...")

        try:
            faq_id = crm_db.add_faq(question, answer, source="call")
            await params.result_callback({
                "success": True,
                "id": faq_id,
                "message": "Đã lưu câu hỏi vào cơ sở kiến thức",
            })
            logger.info(f"✅ CRM FAQ saved (id={faq_id})")

        except Exception as e:
            logger.error(f"❌ CRM save FAQ error: {e}")
            await params.result_callback({"success": False, "error": str(e)})

    return [lookup_customer, check_orders, search_product, search_faq, save_faq]
