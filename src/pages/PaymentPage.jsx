import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import PaymentSelect from "./user/PaymentSelect";
import { Checkbox } from "@mui/material";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { initiateKakaoPay } from "../utils/kakaopayUtils";
import Swal from "sweetalert2";
import CouponModal from "./user/paymentPage/CouponModal";

const PaymentPage = () => {
  const userPhone = useSelector(state => state.user.userPhone) || "";
  const locationData = useSelector(state => state.user.locationData) || "";
  const userAddress = useSelector(state => state.user.userAddress) || "";
  const accessToken = useSelector(state => state.user.accessToken) || "";
  const selectedMenuItems = useSelector(state => state.cart.items) || [];
  const searchTerm = useSelector(state => state.user.searchTerm) || "";
  const { id } = useParams();
  const [isModal, setIsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [request, setRequest] = useState(""); // 요청사항 상태
  const [selectedPayment, setSelectedPayment] = useState(""); // 결제수단 상태
  const [addressDetail1, setAddressDetail1] = useState(""); // 주소 상태
  const [addressDetail, setAddressDetail2] = useState(""); // 상세주소 상태
  const [phone, setPhone] = useState(userPhone); // 휴대전화 상태
  const [agreement, setAgreement] = useState(false); // 결제 동의 체크 상태

  const navigate = useNavigate();
  const restaurantName = sessionStorage.getItem("restaurantName");

  const openModal = item => {
    setSelectedItem(item);
    setIsModal(true);
    document.documentElement.style.overflow = "hidden";
  };

  const closeModal = () => {
    setIsModal(false);
    setSelectedItem(null);
    document.documentElement.style.overflow = "auto";
  };

  // 메뉴 필터링
  const filteredMenuItems = useMemo(() => {
    return selectedMenuItems.filter(
      item => item.menu_res_pk === parseInt(id, 10),
    );
  }, [selectedMenuItems, id]);

  // 메뉴 PK 배열 생성
  const menuPkArray = useMemo(() => {
    return filteredMenuItems.flatMap(item =>
      Array(item.quantity).fill(item.menu_pk),
    );
  }, [filteredMenuItems]);

  // 총 금액 계산
  const totalAmount = useMemo(() => {
    return filteredMenuItems.reduce(
      (sum, item) =>
        sum +
        item.menu_price * item.quantity +
        (item.selectedOptions
          ? Object.values(item.selectedOptions).reduce(
              (optionSum, option) => optionSum + option.optionPrice,
              0,
            ) * item.quantity
          : 0),
      0,
    );
  }, [filteredMenuItems]);

  // 주소 변경 시 userAddress.addr1 또는 addr2 값 업데이트
  useEffect(() => {
    console.log("searchTerm", searchTerm);
    console.log("userAddress.addr1", userAddress.addr1);

    if (searchTerm === userAddress.addr1) {
      setAddressDetail2(userAddress.addr2);
    } else {
      setAddressDetail2("");
    }
  }, [searchTerm]);

  // 총 주문 금액 계산
  const calculateTotalOrderPrice = () => {
    return filteredMenuItems.reduce(
      (total, item) => total + item.menu_price * item.quantity,
      0,
    );
  };

  // 결제 정보 검증 함수
  const validatePaymentInfo = () => {
    if (!addressDetail.trim()) {
      Swal.fire({
        icon: "warning",
        text: "상세주소를 입력해 주세요.",
      });
      return false;
    }
    if (!phone.trim()) {
      Swal.fire({
        icon: "warning",
        text: "휴대전화 번호를 입력해 주세요.",
      });
      return false;
    }
    if (!selectedPayment) {
      Swal.fire({
        icon: "warning",
        text: "결제수단을 선택해 주세요.",
      });
      return false;
    }
    if (!agreement) {
      Swal.fire({
        icon: "warning",
        text: "결제 동의에 체크해 주세요.",
      });
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validatePaymentInfo()) return;

    if (selectedPayment === "3") {
      // 카카오페이 결제
      try {
        const order_pk = await initiateKakaoPay(
          calculateTotalOrderPrice(),
          phone,
          id, // 주문 ID
          accessToken, // 인증 토큰
          request,
          locationData,
          addressDetail,
          menuPkArray,
        );

        if (order_pk) {
          Swal.fire({
            icon: "success",
            text: "결제 완료: " + order_pk,
          });

          navigate(`/mypage/order/${order_pk}`);

          // 결제 성공 후 세션 저장소 데이터 삭제
          sessionStorage.removeItem(`selectedMenuItems_${id}`);
          sessionStorage.removeItem("restaurantName");
        } else {
          throw new Error("결제 완료 후 order_pk를 받지 못했습니다.");
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          text: "결제 실패: " + error.message,
        });
      }
      return;
    }

    const data = {
      order_res_pk: id,
      order_request: request,
      payment_method: selectedPayment,
      order_phone: phone,
      order_address: `${searchTerm} ${addressDetail}`,
      menu: filteredMenuItems.map(item => ({
        menu_pk: item.menu_pk,
        menu_count: item.quantity,
        menu_option_pk: item.menu_option_pk || [],
      })),
      use_mileage: 0,
      coupon: null,
    };

    try {
      const res = await axios.post("/api/order/", data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.data.statusCode === 1) {
        sessionStorage.removeItem(`selectedMenuItems_${id}`);
        sessionStorage.removeItem("restaurantName");

        const orderPk = res.data.resultData.order_pk;

        Swal.fire({
          icon: "success",
          text: res.data.resultMsg,
        });
        navigate(`/mypage/order/${orderPk}`);
      } else {
        Swal.fire({
          icon: "warning",
          text: "결제에 실패했습니다. 다시 시도해주세요.",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        text: error.response
          ? error.response.data.message
          : "결제에 실패했습니다. 다시 시도해주세요.",
      });
    }
  };

  // 휴대전화 번호 형식 적용 함수
  const formatPhoneNumber = value => {
    const cleaned = ("" + value).replace(/\D/g, "");
    const match = cleaned.match(/^(\d{3})(\d{3,4})(\d{4})$/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return value;
  };

  const handleChange = e => {
    const value = e.target.value;
    const onlyNums = value.replace(/[^0-9]/g, "");
    setPhone(formatPhoneNumber(onlyNums));
  };

  const formatPrice = price => {
    return price.toLocaleString();
  };

  const isPaymentDisabled =
    !addressDetail.trim() || !phone.trim() || !selectedPayment || !agreement;

  return (
    <div className="payment-page">
      <div className="payment-page__section">
        <h2 className="payment-page__title">결제하기</h2>
        <div className="payment-page__warp-border">
          <form className="payment-page__form">
            <div className="payment-page__input-wrap">
              <h3 className="payment-page__subtitle">배달정보</h3>
              <div className="payment-page__delivery-info">
                <div>
                  <label htmlFor="address">주소</label>
                  <input
                    type="text"
                    id="address"
                    className="payment-page__input"
                    value={searchTerm}
                    readOnly
                  />
                </div>
                <div>
                  <label htmlFor="addressDetail">상세주소</label>
                  <input
                    type="text"
                    id="addressDetail"
                    className="payment-page__input"
                    placeholder="(필수) 상세주소 입력"
                    value={addressDetail}
                    onChange={e => setAddressDetail2(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="phone">휴대전화번호</label>
                  <input
                    type="text"
                    id="phone"
                    className="payment-page__input"
                    placeholder="(필수) 휴대전화 번호 입력"
                    value={phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
            <div className="payment-page__input-wrap">
              <h3 className="payment-page__subtitle">주문시 요청사항</h3>
              <div className="payment-page__request">
                <textarea
                  name="request"
                  id="request"
                  placeholder="요청사항을 남겨주세요."
                  className="payment-page__textarea"
                  value={request}
                  onChange={e => setRequest(e.target.value)}
                ></textarea>
              </div>
            </div>
            <PaymentSelect onPaymentSelect={setSelectedPayment} />
            <div className="payment-page__input-wrap">
              <h3 className="payment-page__subtitle">할인방법 선택</h3>
              <div className="payment-page__coupon">
                <label htmlFor="coupon">쿠폰</label>
                <div className="payment-page__coupon-wrap">
                  <input
                    type="text"
                    id="coupon"
                    className="payment-page__input"
                    onClick={() => {
                      openModal();
                    }}
                  />
                  <button className="payment-page__coupon-btn btn--default">
                    적용
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
      <div className="payment-page__order-summary">
        <h2 className="payment-page__title">주문내역</h2>
        <div className="payment-page__warp-border">
          <h3 className="payment-page__restaurant-name">{restaurantName}</h3>
          <ul>
            {filteredMenuItems.map((item, index) => (
              <li key={index} className="payment-page__order-item">
                <p>
                  {item.menu_name}
                  {item.selectedOptions && (
                    <div className="order-summary__options">
                      {Object.entries(item.selectedOptions).map(
                        ([optionPk, option]) => (
                          <div key={optionPk}>
                            {option.optionName}: +
                            {formatPrice(option.optionPrice)}원
                          </div>
                        ),
                      )}
                    </div>
                  )}
                  <span>x {item.quantity}개</span>
                </p>
                <p>
                  {formatPrice(
                    item.menu_price +
                      (item.selectedOptions
                        ? Object.values(item.selectedOptions).reduce(
                            (optionSum, option) =>
                              optionSum + option.optionPrice,
                            0,
                          )
                        : 0),
                  )}
                  원
                </p>
              </li>
            ))}
          </ul>

          <div className="payment-page__total-amount">
            <p>총 결제 금액</p>
            <p>{formatPrice(totalAmount)}원</p>
          </div>
        </div>
        <p className="payment-page__terms">
          <label className="agreement-checkbox">
            <span>
              이용약관, 개인정보 수집 및 이용, 개인정보 제3자 제공, 전자금융거래
              이용약관, 만 14세 이상 이용자입니다.
            </span>
            결제에 동의합니다.
            <Checkbox
              sx={{ padding: 0 }}
              checked={agreement}
              onChange={e => setAgreement(e.target.checked)}
            />
          </label>
        </p>
        <button
          className="payment-page__button payment-btn"
          onClick={handlePayment}
          type="submit"
          disabled={isPaymentDisabled}
        >
          결제하기
        </button>
      </div>
      <CouponModal isOpen={isModal} onRequestClose={closeModal} />
    </div>
  );
};

export default PaymentPage;
