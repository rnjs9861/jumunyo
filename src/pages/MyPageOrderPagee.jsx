import { Alert } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jwtAxios from "../api/user/jwtUtil";
import LoadingSpinner from "../components/common/LoadingSpinner";
import NotLogin from "../components/common/mypage/NotLogin";
import Mypage from "../components/join/Mypage";
import OrderListHeader from "../components/user/mypage/OrderListHeader";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";

const MyPageOrderPage = () => {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrderPk, setSelectedOrderPk] = useState(null);
  const [doneOrderPk, setDoneOrderPk] = useState("");
  const [resPk, setResPk] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [orderNow, setOrderNow] = useState(null);
  const { accessToken } = useSelector(state => state.user);

  const navigate = useNavigate();

  const isOlderThanThreeDays = date => {
    const orderDate = new Date(date);
    const currentDate = new Date();
    const threeDaysAgo = new Date(
      currentDate.setDate(currentDate.getDate() - 3),
    );
    return orderDate < threeDaysAgo;
  };

  const reviewOpenModal = (doneOrderPk, resPk) => {
    setReviewOpen(true);
    setSelectedOrderPk(doneOrderPk);
    setDoneOrderPk(doneOrderPk);
    setResPk(resPk);
  };

  const reviewNo = () => {
    setReviewOpen(false);
    setSelectedOrderPk(null);
  };

  const getOrderNow = async () => {
    try {
      const res = await jwtAxios.get("/api/order/user/list");
      setOrderNow(res.data.resultData);
    } catch (error) {
      Swal.fire({
        icon: "error",
        text: "서버 오류",
      });
    }
  };

  const orderCancel = async orderPk => {
    try {
      const res = await jwtAxios.put(`/api/order/cancel/list/${orderPk}`);
      if (res.data.statusCode === -10) {
        Swal.fire({
          icon: "warning",
          text: "이미 접수되었습니다. 고객센터로 문의 해주세요.",
        });
      } else if (res.data.statusCode === 1) {
        Swal.fire({
          icon: "success",
          text: "취소 완료 되었습니다.",
        });
        navigate("/mypage/orderclose");
      }
      getOrderNow();
    } catch (error) {
      Swal.fire({
        icon: "error",
        text: "서버에러입니다.",
      });
    }
  };

  useEffect(() => {
    if (accessToken) {
      setIsLogin(true);
      getOrderNow();
    } else {
      setIsLoading(false);
    }
  }, [accessToken]);

  if (isLoading) {
    return (
      <div className="mypage-wrap">
        <Mypage />
        <LoadingSpinner />
      </div>
    );
  }

  if (!isLogin) {
    return (
      <div className="mypage-wrap">
        <Mypage />
        <NotLogin />
      </div>
    );
  }

  const orderDetails = doneOrderPk => {
    navigate(`../../mypage/order/${doneOrderPk}`);
  };

  return (
    <div className="mypage-wrap">
      <Mypage />
      {orderNow?.length > 0 ? (
        <div className="mypage-box">
          <OrderListHeader />

          {orderNow.length <= 0 && (
            <Alert variant="outlined" severity="info">
              주문내역이 없습니다.
            </Alert>
          )}

          {orderNow.length > 0 && (
            <div className="order-list-gap">
              {orderNow.map(order => (
                <div key={order.orderPk}>
                  <div className="order-list">
                    <div className="order-date">
                      <div>
                        {new Date(order.createdAt).toLocaleDateString("ko-KR")}{" "}
                        - {order.orderState === 2 ? "주문 중" : "조리 중"}
                      </div>
                      <div
                        className="order-detail-text"
                        onClick={() => orderDetails(order.orderPk)}
                      >
                        주문상세
                      </div>
                    </div>
                    <div className="order-main">
                      <img
                        src={order.resPic || "/images/defaultRes.png"}
                        className="order-logo"
                        alt="Order Logo"
                      />
                      <div className="order-detail-box">
                        <div>
                          <div>{order.resName}</div>
                          <div className="order-date">
                            {order.menus[0]?.order_menu_name}
                            {order.menus.length <= 1
                              ? null
                              : ` 외... ${order.menus.length - 1}개`}
                            <br />
                            {order.orderPrice.toLocaleString("ko-KR")}원
                          </div>
                        </div>
                        {order.orderState === 2 ? (
                          <button
                            className="btn"
                            onClick={() => orderCancel(order.orderPk)}
                          >
                            취소하기
                          </button>
                        ) : (
                          "조리중 입니다.."
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mypage-box">
          <OrderListHeader />
          <Alert variant="outlined" severity="info">
            현재 진행중인 주문내역이 없습니다.
          </Alert>
        </div>
      )}
    </div>
  );
};

export default MyPageOrderPage;
