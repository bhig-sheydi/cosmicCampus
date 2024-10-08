import List from '@/components/Analytics/List'
import Table from '@/components/Analytics/Table'
import InlineCode from '@/components/DevUiTools/InlineCode'
import P from '@/components/Typography/P'
import H1 from '@/components/Typography/H1'
import H2 from '@/components/Typography/H2'
import H3 from '@/components/Typography/H3'
import H4 from '@/components/Typography/H4'
import Large from '@/components/Typography/Large'
import Lead from '@/components/Typography/Lead'
import Mute from '@/components/Typography/Mute'
import Q from '@/components/Typography/Q'
import Small from '@/components/Typography/Small'
import { ModeToggle } from '@/components/CustomComponents/mode-toggle'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'

import React from 'react'
import ClickDialogue from '@/components/CustomComponents/ClickDialogue'



const headers = ["King's Treasury", "People's Happiness"];
const rows = [
    ['Empty', 'Overflowing'],
    ['Modest', 'Satisfied'],
    ['Full', 'Ecstatic'],
  ];

  const handleCancel = () => {
    console.log("Cancel action triggered");
  };

  const handleAction = () => {
    console.log("Action triggered");

  };

  const items = [
    '1st level of puns: 5 gold coins',
    '2nd level of jokes: 10 gold coins',
    '3rd level of one-liners: 20 gold coins',
  ];

const Testh1 = () => {
  return (
    <div>
        <H1 className='dark:text-blue-400'>Stuff Is Happning</H1>
        <H2 >Life will pass you by if you dont take chances</H2>
        <H3>Dosnt Mean You Hve To Do Stupid Things</H3>
        <H4>It Just Means Working Hard To Serve Your Best Interest in a legit way</H4>
       <div className='w-[100%]'>
       <P>Lorem ipsum dolor, sit amet consectetur adipisicing elit. Ducimus, quam ullam, aperiam est fuga consequatur animi fugit vitae debitis temporibus doloribus, sequi explicabo? Cum dignissimos nulla corporis cumque consequuntur animi.</P>
       </div>
       <Q>"When ever you fall be sure to get right back up analytics "</Q>

       <Table 
           headers={headers}
           rows={rows}
       />

       <List  items={items}  />


       <InlineCode> console.log(life)</InlineCode>
        

        <Lead>To Be Or Not To Be</Lead>

        <Large>Be Kind All The Time</Large>
        <Small>The Small Things Matter</Small>
        <Mute>Stuff </Mute>

        <ClickDialogue
                            triggerText="Delete Account"
                            title="Delete Account Confirmation"
                            description="Are you sure you want to delete your account? This action cannot be undone."
                            cancelText="No, go back"
                            actionText="Yes, delete"
                            Icon={Trash2} // Pass the Lucide icon component
                            onCancel={handleCancel}
                            onAction={handleAction}
        
        />


        
 

    </div> 


     
  )
}

export default Testh1