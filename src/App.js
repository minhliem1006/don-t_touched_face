import './App.css';
import React,{useEffect,useRef,useState} from 'react';
import backend from '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs' ;
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { initNotifications, notify } from '@mycv/f8-notification';
import {Howl} from 'howler';
import soundURL from "./assets/hey_sondn.mp3";


var sound = new Howl({
  src: [soundURL]
});
// sound.play();

const NOT_TOUCH_LABEL="not_touch";
const TOUCHED_LABEL="touched";
const TRAINING_TIMES = 50;
const TOUCHED_CONFIDENCE = 0.8;
function App() {
  const videos = useRef();
  const classifier = useRef();
  const mobilenetModule = useRef();
  const canPlaySound = useRef(true);

  const [touched,setTouched] = useState(false);
  const init = async() =>
  {
    console.log("init!!");  
    await setupCamera();
    console.log("load camera thanh cong!!");  
    mobilenetModule.current = await mobilenet.load();
    classifier.current = knnClassifier.create();
    console.log("setup done!!");  
    console.log("khong cham tay len mat va bam train1!!");  
    initNotifications({cooldown:3000}); 

  }
  const setupCamera = () => {
    // xin quyen camera
    return new Promise((resolve,reject)=>{
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia || 
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;
        
        if (navigator.getUserMedia) {
          navigator.getUserMedia({ video: true},
             function(stream) {
               videos.current.srcObject = stream;
               videos.current.addEventListener('loadeddata',()=>{
                 resolve("thanh cong");
               })
             },
             function(err) {  
                reject(err);
             }
          );
       } else {
          reject();
       }
    });
  }
  const train = async label =>{
    console.log(`[${label}] dang train...`);
    for(let i=0;i<TRAINING_TIMES;i++)
    {
      console.log(`progress ${parseInt((i+1)/TRAINING_TIMES*100)}%...`);
      await training(label);
    }
  }

  //1 training khuon mat khong cham tay 50 lan;
  //2: cham khuon mat
  // pt so sanh voi data 
  //hoc
  const training = label =>{
    return new Promise(async resolve =>{
      const embedding = mobilenetModule.current.infer(
        videos.current,
        true
      );
      // luu data vao trang thai''
      classifier.current.addExample(embedding,label);
      await sleep(100);
      resolve();
    });
  }
  const run = async ()=>{
      const embedding = mobilenetModule.current.infer(
      videos.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);
    console.log("label:",result.label);
    console.log("label:",result.confidences);
    // check label
    if(result.label===TOUCHED_LABEL && result.confidences[result.label] > TOUCHED_CONFIDENCE)
    {

      console.log("Touched");
      if(canPlaySound.current===true){
          canPlaySound.current=false;
          sound.play();
      }
      notify("Bo tay ra",{body:"ban vua cham tay vao mat"});
      setTouched(true);
    }
    else
    {
      console.log("Not Touched");
      setTouched(false);
      
    }

    // goi lai de kiem tra 
    await sleep(200);
    run();
  }
  const sleep =(ms=0) =>{
    return new Promise(resolve=>{
      setTimeout(resolve,ms);
    });
  }
  //>> component didmount
  useEffect(() => {
    sound.on("end",function(){
      canPlaySound.current=true;
    });
    init();

    //cleanup
    // return ()=>
    // {
    //   //component unmount
    // }
  }, []);
  console.log(videos);  
  return (
    <div className={`main ${touched ? 'touched':""}`}>
      <video 
        ref={videos} 
        className="video"
        autoPlay
      />



      <div className="control">
        <button className="btn" onClick={()=>{train(NOT_TOUCH_LABEL)}}>Train1</button>
        <button className="btn" onClick={()=>{train(TOUCHED_LABEL)}}>Train1</button>
        <button className="btn" onClick={()=>{run()}}>Run</button>
      </div>
    </div>
  );
}

export default App;
