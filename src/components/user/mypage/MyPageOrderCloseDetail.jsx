import axios from "axios";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import LoadingSpinner from "../../common/LoadingSpinner";
import Swal from "sweetalert2";

const MyPageOrderCloseDetail = () => {
  const { id } = useParams();
  const [orderData, setOrderData] = useState(null);
  const accessToken = useSelector(state => state.user.accessToken);

  const navigate = useNavigate();
  const location = useLocation();
  const isOrderClosePage = /^\/mypage\/orderclose\/\d+$/.test(
    location.pathname,
  );

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const response = await axios.get(`/api/done/${id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = response.data;
        if (data.statusCode === 1) {
          setOrderData(data.resultData);
        }
      } catch (error) {
        console.error("Error fetching order data", error);
      }
    };

    fetchOrderData();
  }, [id, accessToken]);

  const onCancelOrder = async () => {
    try {
      const response = await axios.put(`/api/order/cancel/list/${id}`, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = response.data;
      if (data.statusCode === 1) {
        Swal.fire({
          icon: "success",
          text: "주문 취소되었습니다.",
        });
        setOrderData(null);
        navigate("/");
      } else {
        Swal.fire({
          icon: "warning",
          text: "주문 취소에 실패했습니다. 다시 시도해 주세요.",
        });
      }
    } catch (error) {
      console.error("Error cancelling order", error);
      Swal.fire({
        icon: "error",
        text: "주문 취소에 실패했습니다. 다시 시도해 주세요.",
      });
    }
  };

  if (!orderData) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mypage-order">
      <div className="mypage-order-content">
        <div className="mypage-order__header">
          <p className="mypage-order__title">
            {orderData.doneOrderState === 1 ? "주문완료" : "취소완료"}
          </p>
          {orderData.doneOrderState !== 2 && !isOrderClosePage && (
            <button className="btn" onClick={onCancelOrder}>
              주문취소
            </button>
          )}
        </div>
        <div className="mypage-order__contents">
          {orderData.doneOrderState === 1 ? (
            <div className="주문완료-안내">
              <p className="mypage-order__thanks">주문 감사합니다</p>
              <p className="mypage-order__confirmation">
                주문 요청이 완료되었으며 고객님의 휴대전화 번호로 주문 확인
                문자가 곧 발송됩니다
              </p>
            </div>
          ) : (
            <div className="취소-안내">
              <p className="mypage-order__thanks">주문 취소되었습니다</p>
              <p className="mypage-order__confirmation">
                주문이 취소되었으며 고객님의 휴대전화 번호로 주문 확인 문자가 곧
                발송됩니다
              </p>
            </div>
          )}

          <div className="mypage-order__section">
            <div className="mypage-order__section-title">배달정보</div>
            <div className="mypage-order__detail">
              <p className="mypage-order__label">음식점</p>
              <p className="mypage-order__value">{orderData.resName}</p>
            </div>
            <div className="mypage-order__detail">
              <p className="mypage-order__label">주문번호</p>
              <p className="mypage-order__value">{id}</p>
            </div>
            <div className="mypage-order__detail">
              <p className="mypage-order__label">주문시간</p>
              <p className="mypage-order__value">
                {new Date(orderData.createdAt).toLocaleString()}
              </p>
            </div>
            {orderData.doneOrderState === 1 && (
              <div className="mypage-order__detail none">
                <p className="mypage-order__label">배달완료시간</p>
                <p className="mypage-order__value">
                  {orderData.orderState === 1 ? "배달 완료" : "배달 중"}
                </p>
              </div>
            )}
          </div>

          <div className="mypage-order__section">
            <div className="mypage-order__section-title">주문자 정보</div>
            <div className="mypage-order__detail">
              <p className="mypage-order__label">연락처</p>
              <p className="mypage-order__value">{orderData.orderPhone}</p>
            </div>
            <div className="mypage-order__detail">
              <p className="mypage-order__label">주소</p>
              <p className="mypage-order__value">{orderData.orderAddress}</p>
            </div>
            <div className="mypage-order__detail">
              <p className="mypage-order__label">가게 요청사항</p>
              <p className="mypage-order__value">{orderData.orderRequest}</p>
            </div>
            <div className="mypage-order__detail none">
              <p className="mypage-order__label">라이더 요청사항</p>
              <p className="mypage-order__value">없음</p>
            </div>
            <div className="mypage-order__detail">
              <p className="mypage-order__label">결제수단</p>
              <p className="mypage-order__value">{orderData.paymentMethod}</p>
            </div>
          </div>

          <div className="mypage-order__section">
            <div className="mypage-order__section-title">주문내역</div>
            <ul className="mypage-order__item">
              {orderData.menuInfoList.map((menu, index) => (
                <li key={index}>
                  <p className="mypage-order__item-name">
                    {menu.menuName} <span>x 1개</span>
                  </p>
                  <p className="mypage-order__item-price">
                    {menu.menuPrice.toLocaleString()}원
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="mypage-order__total">
            <p className="mypage-order__total-label">총 결제금액</p>
            <p className="mypage-order__total-price">
              {orderData.orderPrice.toLocaleString()}원
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPageOrderCloseDetail;
