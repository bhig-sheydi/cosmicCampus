"use client";
import React, { useState, useEffect } from "react";
import AutoCarousel from "./AutoCarousel";
import { Card, CardContent } from "@/components/ui/card";
import WhatWeOfferSlide from "./WhatWeOfferSlide";

const aboutContent = [
    {
        title: "What We Offer",
        services: [
            { name: "Long-Term Data Storage", description: "Reliable solutions for securely storing your data over time." },
            { name: "Data Analysis Tools", description: "Powerful tools for extracting insights from your data." },
            { name: "Organized Information", description: "Efficient systems for organizing and managing information." },
            { name: "Human Resources Management", description: "Comprehensive solutions for managing HR processes effectively." },
            { name: "Payment Services", description: "Streamlined payment solutions for your business needs." },
            { name: "Find Schools Feature", description: "Parents can search for schools, and schools can attract students effortlessly." },
            { name: "Student Result Carry-Over", description: "Ensures seamless transfer of academic records when students switch schools." },
            { name: "AI-Generated Timetables", description: "Automatically creates optimized schedules for teachers and students." },
            { name: "AI Lesson Note Upgrades", description: "Enhances lesson notes with suggestions for improvements." },
            { name: "AI Exam Question Generation", description: "Generates exam questions based on uploaded lesson notes." },
            { name: "WAEC, JAMB & NECO Predictions", description: "Predicts potential exam questions using AI-driven statistical analysis." },
            { name: "Student Performance Analysis", description: "Tracks exam records and behavior, providing recommendations for improvement." },
            { name: "Daily, Termly & Yearly Ranking System", description: "Ranks students based on performance across different time frames." },
            { name: "Assignment Reminders", description: "Notifies students to complete assignments on time." },
            { name: "Parental Notifications", description: "Alerts parents when attendance is taken and when school is over." },
            { name: "E-Commerce Platform", description: "A mini store unique to each school for educational materials." },
            { name: "Location-Based Attendance", description: "Verifies teacher attendance based on real-time location data." },
            { name: "And So Much More", description: "Additional features designed to enhance school management and student learning." }
        ]
    },
    {
        title: "Our Vision",
        description:
            "We aim to leverage our cutting-edge data analytics technology to accurately record and analyze students’ academic and social data, providing insightful information for students, schools, guardians, and even state and national stakeholders."
    },
    {
        title: "Our Mission",
        description:
            "Our mission is to create a dynamic global network of schools, where educators and students can connect, collaborate, and inspire one another while preserving the unique identities and traditions of each institution."
    }
];



const renderAboutSlide = (item, index) => {
    if (item.title === "What We Offer") {
        return <WhatWeOfferSlide key={index} services={item.services} />;
    }
    return (
        <div className="">
            <div key={index} className=" relative flex flex-col items-center justify-center w-screen h-screen px-4">
                <div>
                    <h1 className="text-4xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"> About</h1>
                </div>
                <h1 className="text-3xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                    {item.title}
                </h1>
                <Card className="relative w-full max-w-4xl p-8 rounded-2xl shadow-xl bg-opacity-90">
                    <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                        <p className="text-lg text-gray-800 dark:text-gray-200">
                            {item.description}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default function About() {
    return (
        <div className="relative w-full pl-10 pr-10 pt-10 pb-40">
            <AutoCarousel
                items={aboutContent}
                renderSlide={(item, index) => renderAboutSlide(item, index)}
                delay={5000}
                totalPages={aboutContent.length} // Passing total pages dynamically
            />
        </div>
    );
}
