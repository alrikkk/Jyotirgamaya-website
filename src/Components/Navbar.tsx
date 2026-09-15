"use client";
import React, { useState } from "react";
import Link from "next/link";
import {
  FaInstagram,
  FaWhatsapp,
  FaLinkedin,
  FaTelegramPlane,
} from "react-icons/fa";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import type { Social, NavigationItem } from "@/types";
import NavItems from "./NavItems";
import { motion } from "motion/react";
import Image from "next/image";

function Navbar() {
  const [phoneNavOpen, setPhoneNavOpen] = useState(false);
  const navItems: NavigationItem[] = [
    {
      name: "Home",
      link: "/",
    },
    {
      name: "Autism Care Center",
      link: "/autism-care-center",
    },
    {
      name: "Career Counselling",
      link: "/career-counselling",
    },
    {
      name: "Services",
      link: "/services",
    },
    {
      name: "Internships",
      link: "/internships",
    },
    {
      name: "About Us",
      link: "/about-us",
    },
  ];

  const socials: Social[] = [
    {
      name: "Instagram",
      icon: <FaInstagram />,
      link: "www.google.com",
    },
    {
      name: "Instagram",
      icon: <FaLinkedin />,
      link: "www.google.com",
    },
    {
      name: "Instagram",
      icon: <FaTelegramPlane />,
      link: "www.google.com",
    },
    {
      name: "Instagram",
      icon: <FaWhatsapp />,
      link: "www.google.com",
    },
  ];

  return (
    <nav className={`bg-white py-2 flex justify-center sticky top-0 z-50 w-screen`}>
      <div className="flex md:justify-around justify-between px-6 w-full items-center cursor-pointer text-nowrap">
        <Link href={"/"}>
          <Image src="/Logo.png" height={200} width={200} alt="Logo" className="h-20 w-auto aspect-auto" />
        </Link>
        <ul className="sm:flex hidden w-fit md:space-x-10 space-x-4 md:justify-normal justify-end text-base">
          <NavItems items={navItems} phoneNavOpen={phoneNavOpen} setPhoneNavOpen={setPhoneNavOpen} />
        </ul>
        <div className="hidden space-x-5 lg:flex">
          {socials.map((social: Social, index: number) => (
            <Link
              href={social.link}
              target="_blank"
              rel="noopener noreferrer"
              key={"icon" + index + 1}
              className="text-xl hover:text-blue">
              {social.icon}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex sm:hidden w-1/2 text-5xl items-center justify-end mr-2">
        <motion.span
          animate={{
            left: phoneNavOpen ? 0 : "initial", // Rotate 90 degrees when open
            rotateY: phoneNavOpen ? 180 : 0,
          }}
          transition={{
            type: "tween",
            duration: 0.6,
          }}
          className="absolute z-20 text-black">
          <HiOutlineMenuAlt3 onClick={() => setPhoneNavOpen((prev) => !prev)} />
        </motion.span>
      </div>
      <motion.div className="sm:hidden fixed top-0 left-[-1000px] h-full w-full bg-white"
        animate={{
          left: phoneNavOpen ? 0 : -1000,
          transition: {
            duration: 0.6,
            type: "tween"
          }
        }}
      >
        <ul className="sm:hidden flex h-[80%] w-full flex-col items-center justify-center text-2xl gap-y-5">
          <NavItems items={navItems} phoneNavOpen={phoneNavOpen} setPhoneNavOpen={setPhoneNavOpen} />
        </ul>
        <div className="space-x-5 flex justify-center">
          {socials.map((social: Social, index: number) => (
            <Link
              href={social.link}
              target="_blank"
              rel="noopener noreferrer"
              key={"icon" + index + 1}
              className="text-xl hover:text-blue">
              {social.icon}
            </Link>
          ))}
        </div>
      </motion.div>
    </nav>
  );
}

export default Navbar;
