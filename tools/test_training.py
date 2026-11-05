import copy,unittest
from train_risk_baseline import synthetic,validate,train
class TrainingContract(unittest.TestCase):
 def test_lineage_and_time_leakage(self):
  rows=synthetic();validate(rows)
  invalid=copy.deepcopy(rows);invalid[360]['group_id']=invalid[0]['group_id']
  with self.assertRaisesRegex(AssertionError,'Group leakage'):validate(invalid)
  invalid=copy.deepcopy(rows);invalid[0]['as_of_date']='2099-01-01'
  with self.assertRaisesRegex(AssertionError,'Temporal leakage'):validate(invalid)
 def test_reproducibility_and_binary_labels(self):
  rows=synthetic();a=train(rows,'synthetic','test-v1');b=train(rows,'synthetic','test-v1')
  self.assertEqual(a,b);self.assertTrue(a['notForProduction']);self.assertEqual(a['metrics']['test']['rows'],120)
  rows[0]['label']='unknown'
  with self.assertRaises(AssertionError):validate(rows)
if __name__=='__main__':unittest.main()
