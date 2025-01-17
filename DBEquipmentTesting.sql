--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

-- Started on 2025-01-17 04:31:10 MSK

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 24580)
-- Name: employee; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee (
    id uuid NOT NULL,
    full_name character varying(50) NOT NULL,
    "position" integer NOT NULL
);


ALTER TABLE public.employee OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 24577)
-- Name: equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipment (
    id uuid NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.equipment OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 24583)
-- Name: task; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task (
    id uuid NOT NULL,
    employee_id uuid NOT NULL,
    equipment_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL
);


ALTER TABLE public.task OWNER TO postgres;

--
-- TOC entry 3613 (class 0 OID 24580)
-- Dependencies: 218
-- Data for Name: employee; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee (id, full_name, "position") FROM stdin;
2debcbe6-9e26-42d1-afeb-4a54fc76eff9	Ivan Petrovich Sokolov	0
232ca930-3579-47ec-b7a5-d27ca7d7abf5	Sergey Viktorovich Smirnov	1
\.


--
-- TOC entry 3612 (class 0 OID 24577)
-- Dependencies: 217
-- Data for Name: equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipment (id, name) FROM stdin;
bcbf75f0-fadf-4aaa-b416-2664e35d26f3	Smartphone
e34ea341-b3a5-4298-90b1-a150e02e1363	Tablet
38c4f4af-5eb7-4001-ba08-cce676a934ff	Laptop
\.


--
-- TOC entry 3614 (class 0 OID 24583)
-- Dependencies: 219
-- Data for Name: task; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task (id, employee_id, equipment_id, start_date, end_date) FROM stdin;
307d5dc8-1b68-494e-951a-f9c8687f72cd	2debcbe6-9e26-42d1-afeb-4a54fc76eff9	bcbf75f0-fadf-4aaa-b416-2664e35d26f3	2024-01-01	2024-01-10
9194ffea-23e8-42e6-9a11-a91e43bbb32c	232ca930-3579-47ec-b7a5-d27ca7d7abf5	e34ea341-b3a5-4298-90b1-a150e02e1363	2025-01-20	2025-01-25
fb8101ca-0904-4cf0-a176-5766b1919817	2debcbe6-9e26-42d1-afeb-4a54fc76eff9	e34ea341-b3a5-4298-90b1-a150e02e1363	2024-01-15	2024-01-20
\.


--
-- TOC entry 3462 (class 2606 OID 24589)
-- Name: employee employee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_pkey PRIMARY KEY (id);


--
-- TOC entry 3457 (class 2606 OID 24590)
-- Name: employee employee_position_check; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.employee
    ADD CONSTRAINT employee_position_check CHECK (("position" >= 0)) NOT VALID;


--
-- TOC entry 3460 (class 2606 OID 24587)
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- TOC entry 3458 (class 2606 OID 24591)
-- Name: task test_check; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE public.task
    ADD CONSTRAINT test_check CHECK ((start_date < end_date)) NOT VALID;


--
-- TOC entry 3464 (class 2606 OID 24593)
-- Name: task test_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT test_pkey PRIMARY KEY (id);


--
-- TOC entry 3465 (class 2606 OID 24599)
-- Name: task test_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT test_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id);


--
-- TOC entry 3466 (class 2606 OID 24594)
-- Name: task test_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT test_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id);


--
-- TOC entry 3620 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE employee; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.employee TO etadmin;


--
-- TOC entry 3621 (class 0 OID 0)
-- Dependencies: 217
-- Name: TABLE equipment; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.equipment TO etadmin;


--
-- TOC entry 3622 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE task; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task TO etadmin;


-- Completed on 2025-01-17 04:31:10 MSK

--
-- PostgreSQL database dump complete
--

