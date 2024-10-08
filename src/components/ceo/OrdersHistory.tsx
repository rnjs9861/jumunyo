import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface MenuInfoDto {
  menuName: string;
  menuPrice: number;
}

interface Order {
  doneOrderPk: number;
  createdAt: string;
  doneOrderState: number;
  menuInfoDtos: MenuInfoDto[];
  orderPrice: number;
}

const getCookie = (name: string): string | undefined => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
};

const OrdersHistory: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<
    "all" | "accepted" | "refused"
  >("all");
  const [acceptedOrders, setAcceptedOrders] = useState<Order[]>([]);
  const [refusedOrders, setRefusedOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [maxPage, setMaxPage] = useState<number>(1);

  useEffect(() => {
    if (selectedTab === "accepted") {
      getAcceptedOrders(currentPage);
    } else if (selectedTab === "refused") {
      getRefusedOrders(currentPage);
    } else if (selectedTab === "all") {
      getAllOrders(currentPage);
    }
  }, [selectedTab, currentPage]);

  const getAcceptedOrders = async (page: number) => {
    try {
      const accessToken = getCookie("accessToken");
      const response = await axios.get(
        `/api/done/owner/done/list?page=${page - 1}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const data = response.data;
      if (data.statusCode === 1 || data.statusCode === 2) {
        setAcceptedOrders(data.resultData.contents);
        setMaxPage(data.resultData.maxPage);
      } else {
        setAcceptedOrders([]);
      }
    } catch (error) {
      setAcceptedOrders([]);
    }
  };

  const getRefusedOrders = async (page: number) => {
    try {
      const accessToken = getCookie("accessToken");
      const response = await axios.get(
        `/api/done/owner/cancel/list?page=${page - 1}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const data = response.data;
      if (data.statusCode === 1 || data.statusCode === 2) {
        setRefusedOrders(data.resultData.contents);
        setMaxPage(data.resultData.maxPage);
      } else {
        setRefusedOrders([]);
      }
    } catch (error) {
      setRefusedOrders([]);
    }
  };

  const getAllOrders = async (page: number) => {
    try {
      const accessToken = getCookie("accessToken");
      const [acceptedResponse, refusedResponse] = await Promise.all([
        axios.get(`/api/done/owner/done/list?size=10&page=${page - 1}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        axios.get(`/api/done/owner/cancel/list?size=10&page=${page - 1}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      ]);

      const acceptedData = acceptedResponse.data;
      const refusedData = refusedResponse.data;

      let allData: Order[] = [];
      if (
        (acceptedData.statusCode === 1 || acceptedData.statusCode === 2) &&
        (refusedData.statusCode === 1 || refusedData.statusCode === 2)
      ) {
        allData = [
          ...acceptedData.resultData.contents,
          ...refusedData.resultData.contents,
        ];
      } else if (
        acceptedData.statusCode === 1 ||
        acceptedData.statusCode === 2
      ) {
        allData = acceptedData.resultData.contents;
      } else if (refusedData.statusCode === 1 || refusedData.statusCode === 2) {
        allData = refusedData.resultData.contents;
      }

      allData.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setAllOrders(allData);
      setMaxPage(
        Math.max(
          acceptedData.resultData.maxPage,
          refusedData.resultData.maxPage,
        ),
      );
    } catch (error) {
      setAllOrders([]);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString();
  };

  const renderOrders = (orders: Order[], emptyMessage: JSX.Element) => {
    return orders.length > 0 ? (
      orders.map(order => (
        <div className="ceo-orderList" key={order.doneOrderPk}>
          <div className="ceo-order-header">
            <div className="order-header-left">
              <div className="order-header-title">
                {new Date(order.createdAt).toLocaleDateString()} -
                <span>
                  {order.doneOrderState === 1 ? "주문완료" : "주문취소"}
                </span>
              </div>
              <div className="order-header-left-wrap">
                <div className="order-header-left-content">
                  <div className="order-header-left-content-title">
                    주문번호: {order.doneOrderPk}
                  </div>
                  <div className="order-header-left-content-text">
                    {order.menuInfoDtos.length > 0 && (
                      <span>
                        {order.menuInfoDtos[0].menuName}
                        {formatPrice(order.menuInfoDtos[0].menuPrice)}원
                        {order.menuInfoDtos.length > 1 && (
                          <>
                            외 {order.menuInfoDtos.length - 1}개 총
                            {formatPrice(order.orderPrice)}원
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="order-header-right">
              <Link
                to={`/ceopage/orders/details/${order.doneOrderPk}`}
                className="btn"
              >
                주문상세
              </Link>
            </div>
          </div>
        </div>
      ))
    ) : (
      <div>{emptyMessage}</div>
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= maxPage) {
      setCurrentPage(newPage);
    }
  };

  const renderPagination = () => {
    const pageNumbers = [];
    for (let i = 1; i <= Math.min(maxPage, 10); i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="paginationforOrderHistory">
        <button
          className="btn btnNextandBefore"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          이전
        </button>
        {pageNumbers.map(pageNumber => (
          <button
            key={pageNumber}
            onClick={() => handlePageChange(pageNumber)}
            className={currentPage === pageNumber ? "active" : ""}
          >
            {pageNumber}
          </button>
        ))}
        <button
          className="btn btnNextandBefore"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === maxPage}
        >
          다음
        </button>
      </div>
    );
  };

  return (
    <div className="ceo-order-wrap">
      <h2 className="ceo-order-tab">주문내역</h2>
      <div className="orderListing">
        <ul className="tabforchoiceUl">
          <li>
            <button
              className={`btn ${selectedTab === "all" ? "active" : ""}`}
              onClick={() => {
                setSelectedTab("all");
                setCurrentPage(1);
              }}
            >
              전체 주문
            </button>
            <button
              className={`btn ${selectedTab === "accepted" ? "active" : ""}`}
              onClick={() => {
                setSelectedTab("accepted");
                setCurrentPage(1);
              }}
            >
              접수 주문
            </button>
            <button
              className={`btn ${selectedTab === "refused" ? "active" : ""}`}
              onClick={() => {
                setSelectedTab("refused");
                setCurrentPage(1);
              }}
            >
              거절 주문
            </button>
          </li>
        </ul>
      </div>
      <div className="ceo-order-content">
        {selectedTab === "accepted" && (
          <div className="accepted">
            {renderOrders(
              acceptedOrders,
              <div className="noListMsg">완료된 주문이 없습니다.</div>,
            )}
          </div>
        )}
        {selectedTab === "refused" && (
          <div className="refused">
            {renderOrders(
              refusedOrders,
              <div className="noListMsg">거절된 주문이 없습니다.</div>,
            )}
          </div>
        )}
        {selectedTab === "all" && (
          <div className="all">
            {renderOrders(
              allOrders,
              <div className="noListMsg">
                아직 주문이 없습니다. 주문을 받아주세요!
              </div>,
            )}
          </div>
        )}
      </div>
      {renderPagination()}
    </div>
  );
};

export default OrdersHistory;
