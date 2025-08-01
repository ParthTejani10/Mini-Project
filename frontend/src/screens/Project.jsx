import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../context/user.context';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../config/axios';
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket';
import Markdown from 'markdown-to-jsx';
import { getWebContainer } from '../config/webcontainer';

function SyntaxHighlightedCode(props) {
    const ref = useRef(null);

    React.useEffect(() => {
        if (ref.current && props.className?.includes('lang-') && window.hljs) {
            window.hljs.highlightElement(ref.current);
            ref.current.removeAttribute('data-highlighted');
        }
    }, [props.className, props.children]);

    return <code {...props} ref={ref} />;
}

const Project = () => {
    const location = useLocation();
    const { user } = useContext(UserContext);
    const messageBox = useRef(null);

    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(new Set());
    const [project, setProject] = useState(location.state.project);
    const [message, setMessage] = useState('');
    const [users, setUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [fileTree, setFileTree] = useState({});
    const [currentFile, setCurrentFile] = useState(null);
    const [openFiles, setOpenFiles] = useState([]);
    const [webContainer, setWebContainer] = useState(null);
    const [iframeUrl, setIframeUrl] = useState(null);
    const [runProcess, setRunProcess] = useState(null);

    const handleUserClick = (id) => {
        setSelectedUserId((prevSelectedUserId) => {
            const newSelectedUserId = new Set(prevSelectedUserId);
            if (newSelectedUserId.has(id)) {
                newSelectedUserId.delete(id);
            } else {
                newSelectedUserId.add(id);
            }
            return newSelectedUserId;
        });
    };

    const addCollaborators = () => {
        axios
            .put('/projects/add-user', {
                projectId: location.state.project._id,
                users: Array.from(selectedUserId),
            })
            .then((res) => {
                console.log(res.data);
                setIsModalOpen(false);
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const send = () => {
        sendMessage('project-message', {
            message,
            sender: user,
        });
        setMessages((prevMessages) => [...prevMessages, { sender: user, message }]);
        setMessage('');
    };

    const WriteAiMessage = (message) => {
        const messageObject = JSON.parse(message)

        return (
            <div
                className='overflow-auto bg-slate-950 text-white rounded-sm p-2'
            >
                <Markdown
                    children={messageObject.text}
                    options={{
                        overrides: {
                            code: SyntaxHighlightedCode,
                        },
                    }}
                />
            </div>)

    };

    useEffect(() => {
        initializeSocket(project._id);

        if (!webContainer) {
            getWebContainer().then((container) => {
                setWebContainer(container);
                console.log('container started');
            });
        }

        receiveMessage('project-message', (data) => {
            console.log('Received data:', data); // Debugging log

            if (data.sender._id === 'ai') {
                const message = JSON.parse(data.message);
                console.log('Parsed AI message:', message);

                webContainer?.mount(data.fileTree);

                if (data.fileTree) {
                    setFileTree(data.fileTree || {});
                }
                setMessages((prevMessages) => [...prevMessages, data]); // Update messages state
            } else {
                setMessages((prevMessages) => [...prevMessages, data]); // Update messages state
            }
        });

        axios.get(`/projects/get-project/${location.state.project._id}`).then((res) => {
            console.log(res.data.project);
            setProject(res.data.project);
            setFileTree(res.data.project.fileTree || {});
        });

        axios
            .get('/users/all')
            .then((res) => {
                setUsers(res.data.users);
            })
            .catch((err) => {
                console.log(err);
            });
    }, []);

    const saveFileTree = (ft) => {
        axios
            .put('/projects/update-file-tree', {
                projectId: project._id,
                fileTree: ft,
            })
            .then((res) => {
                console.log(res.data);
            })
            .catch((err) => {
                console.log(err);
            });
    };

    useEffect(() => {
        if (messageBox.current) {
            messageBox.current.scrollTop = messageBox.current.scrollHeight;
        }
    }, [messages]);

    return (
        <main className="h-screen w-screen flex">
            <section className="flex flex-col h-screen w-screen bg-slate-300">
                <header className="flex justify-between items-center p-2 px-4 w-full bg-slate-100">
                    <button className="flex gap-2" onClick={() => setIsModalOpen(true)}>
                        <i className="ri-add-fill mr-1"></i>
                        <p>Add collaborator</p>
                    </button>
                    <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className="p-2">
                        <i className="ri-group-fill"></i>
                    </button>
                </header>
                <div className="conversation-area pt-14 pb-10 flex-grow flex flex-col h-full relative">
                    <div
                        ref={messageBox}
                        className="message-box p-1 flex-grow flex flex-col gap-1 overflow-auto max-h-full scrollbar-hide"
                    >
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`${msg.sender._id === 'ai' ? 'max-w-80' : 'max-w-52'} ${msg.sender._id === user._id.toString() && 'ml-auto'
                                    }  message flex flex-col p-2 bg-slate-50 w-fit rounded-md`}
                            >
                                <small className="opacity-65 text-xs">{msg.sender.email}</small>
                                <div className="text-sm">
                                    {msg.sender._id === 'ai' ? WriteAiMessage(msg.message) : <p>{msg.message}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="inputField w-full flex absolute bottom-0">
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="p-2 px-4 border-none outline-none flex-grow"
                            type="text"
                            placeholder="Enter message"
                        />
                        <button onClick={send} className="px-5 bg-slate-950 text-white">
                            <i className="ri-send-plane-fill"></i>
                        </button>
                    </div>
                </div>
                <div className={`sidePanel w-full h-full flex flex-col gap-2 bg-slate-50 absolute transition-all ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} top-0`}>
                    <header className='flex justify-between items-center px-4 p-2 bg-slate-200'>
                        <h1 className='font-semibold text-lg'>Collaborators</h1>
                        <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className='p-2'>
                            <i className="ri-close-fill"></i>
                        </button>
                    </header>
                    <div className="users flex flex-col gap-2">
                        {project.users && project.users.map(user => (
                            <div className="user cursor-pointer hover:bg-slate-200 p-2 flex gap-2 items-center">
                                <div className='aspect-square rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600'>
                                    <i className="ri-user-fill absolute"></i>
                                </div>
                                <h1 className='font-semibold text-lg'>{user.email}</h1>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-md w-96 max-w-full relative">
                        <header className='flex justify-between items-center mb-4'>
                            <h2 className='text-xl font-semibold'>Select User</h2>
                            <button onClick={() => setIsModalOpen(false)} className='p-2'>
                                <i className="ri-close-fill"></i>
                            </button>
                        </header>
                        <div className="users-list flex flex-col gap-2 mb-16 max-h-96 overflow-auto">
                            {users.map(user => (
                                <div key={user.id} className={`user cursor-pointer hover:bg-slate-200 ${Array.from(selectedUserId).indexOf(user._id) != -1 ? 'bg-slate-200' : ""} p-2 flex gap-2 items-center`} onClick={() => handleUserClick(user._id)}>
                                    <div className='aspect-square relative rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600'>
                                        <i className="ri-user-fill absolute"></i>
                                    </div>
                                    <h1 className='font-semibold text-lg'>{user.email}</h1>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addCollaborators}
                            className='absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-600 text-white rounded-md'>
                            Add Collaborators
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Project;