import { getSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import Button from "../components/Button";
import DateSidebar from "../components/DateSidebar";
import EmailModal from "../components/EmailModal";
import Navbar from "../components/Navbar";
import OrderSummaryCard from "../components/OrderSummaryCard";
import * as db from "./api/database";
import { allowedEmails } from "./login";

export async function getServerSideProps(context) {
    const session = await getSession(context);

    if (
        process.env.NODE_ENV !== "development" &&
        (!session || !allowedEmails.includes(session.user.email))
    ) {
        context.res.writeHead(302, { Location: "/login" });
        context.res.end();
        return {};
    }
    const smallestPossibleDate = new Date(0);
    const oneYearFromNow = new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
    );
    const dates = {
        start_date: smallestPossibleDate,
        end_date: oneYearFromNow,
    };
    const [orderData, products] = await Promise.all([
        db.getAllData(dates),
        db.getProductNames(),
    ]);

    return {
        props: {
            initialOrderData: orderData,
            initialProductNames: products,
        },
    };
}

export default function OrderDashboard({
    initialOrderData,
    initialProductNames,
}) {
    const [activeDate, setActiveDate] = useState("All");
    const [orderData, setOrderData] = useState(initialOrderData);
    const [productNames, setProductNames] = useState(initialProductNames);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [modalBody, setModalBody] = useState("");
    const [modalOrderUid, setModalOrderUid] = useState("");

    const dateRanges = {
        All: {
            start_date: new Date(0),
            end_date: new Date(
                new Date().setFullYear(new Date().getFullYear() + 1)
            ),
        },
        "1st": {
            start_date: new Date("2022-11-24"),
            end_date: new Date("2022-12-01"),
        },
        "8th": {
            start_date: new Date("2022-12-01"),
            end_date: new Date("2022-12-08"),
        },
        "15th": {
            start_date: new Date("2022-12-08"),
            end_date: new Date("2022-12-15"),
        },
        "22nd": {
            start_date: new Date("2022-12-15"),
            end_date: new Date("2022-12-22"),
        },
    };

    const changeDate = async (date) => {
        const [newOrderData, newProductNames] = await Promise.all([
            db.getAllData(dateRanges[date]),
            db.getProductNames(),
        ]);
        setOrderData(newOrderData);
        setProductNames(newProductNames);
        setActiveDate(date);
    };

    const openPrintLayout = async () => {
        await document.querySelectorAll(".flip-override").forEach((el) => {
            el.click();
        });
        window.print();
        return true;
    };

    const openEmailModal = (customer_name, order_uid) => {
        setModalBody(
            `<p style="margin:0; padding-bottom: 1rem">Send To: ${customer_name}</p> Email Message: <br><textarea id="email-body-textarea" rows="4" style="border: 1px solid black; border-radius: 5px; padding: 0.5rem; width: 100%;"></textarea>`
        );
        setModalOrderUid(order_uid);
        setModalIsOpen(true);
    };

    const closeEmailModal = () => {
        setModalBody("");
        setModalIsOpen(false);
    };

    const sendEmailCallback = async () => {
        const email_body = document.getElementById("email-body-textarea").value;
        const order_data = orderData.find(
            (order) => order.order_uid === modalOrderUid
        );
        const response = await fetch("/api/sendDeferredOrderEmail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                order_data,
                products: productNames,
                email_body,
            }),
        });
        if (response.status === 200) {
            document.getElementById(
                `${modalOrderUid}-email-sent-message`
            ).innerText = "Sent";
        }
        closeEmailModal();
    };

    return (
        <div className="overflow-hidden print:overflow-visible">
            <div className={`${modalIsOpen ? "" : "hidden"}`}>
                <EmailModal
                    header={"SEND EMAIL"}
                    body={modalBody}
                    closeCallback={() => {
                        closeEmailModal();
                    }}
                    sendEmailCallback={sendEmailCallback}
                />
            </div>
            <h1 className="absolute flex pl-5 md:pl-0 md:justify-center items-center text-2xl sm:text-4xl font-bold py-6 bg-default-100 w-full print:hidden">
                ORDER DASHBOARD
                <div>
                    <Button
                        type="secondary-md"
                        img="/images/icons/printer.png"
                        clickHandler={openPrintLayout}
                    />
                </div>
            </h1>
            <div className="absolute z-10 top-0 right-0 ml-auto flex items-center justify-end sm:my-5 sm:pr-2 print:hidden">
                <Button
                    type="primary-md"
                    img="/images/icons/logout.svg"
                    clickHandler={() => {
                        signOut();
                        return true;
                    }}
                ></Button>
            </div>
            <div className="absolute z-[100] top-0 left-0 w-62 items-center justify-start hidden sm:flex my-2 pl-2 md:pr-5 print:hidden">
                <div className="hidden rounded-md px-3 py-3 bg-default-900 md:flex w-[60px] sm:w-[60px] md:w-[80px]">
                    <Image
                        src="/images/misc/logo.png"
                        width="100"
                        height="100"
                    />
                </div>
            </div>
            <div className="print:hidden">
                <DateSidebar activeDate={activeDate} changeDate={changeDate} />
            </div>
            <div className="flex h-screen sm:items-center">
                <div
                    className={`grid grid-cols-1 gap-y-3 gap-x-3 overflow-auto
            px-8 pt-2 max-h-[65vh] sm:max-h-full sm:pl-5 sm:pr-5 mt-44 sm:mt-0 sm:pt-20 md:pt-20 md:pb-2 md:mb-20 md:mt-0 justify-start md:ml-40 sm:grid-rows-2 sm:grid-cols-none 
            sm:grid-flow-col md:gap-x-10 sm:gap-y-3 print:max-h-full print:top-0 
            print:left-0 print:table print:m-0 print:p-0 print:gap-0 print:overflow-hidden print:absolute`}
                >
                    {orderData.map((order) => {
                        return (
                            <OrderSummaryCard
                                key={order.order_uid}
                                order={order}
                                productNames={productNames}
                                openEmailModal={openEmailModal}
                            />
                        );
                    })}
                </div>
            </div>

            <div className="print:hidden">
                <Navbar activeTab="order_dashboard" />
            </div>
        </div>
    );
}
